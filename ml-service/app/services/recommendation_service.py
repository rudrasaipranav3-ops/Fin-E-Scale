from collections import Counter, defaultdict

from app.schemas.recommendation import (
    RecommendationRequest,
    RecommendationResponse,
    CustomerRecommendation,
    RecommendedProduct,
)


MODEL_VERSION = "hybrid-recommendation-v2.3"

# ---------------------------------------------------------
# HYBRID SCORING WEIGHTS
# ---------------------------------------------------------

MARKET_BASKET_WEIGHT = 0.50
CUSTOMER_PREFERENCE_WEIGHT = 0.30
POPULARITY_WEIGHT = 0.20

# Customers with very little/no history
COLD_START_POPULARITY_WEIGHT = 0.50
COLD_START_GLOBAL_PREFERENCE_WEIGHT = 0.50

MIN_HISTORY_FOR_PERSONALIZED_MODEL = 1

# Diversity constraint:
# Do not allow too many recommendations from one category.
MAX_RECOMMENDATIONS_PER_CATEGORY = 2

TOP_K = 5


def _normalize(value: float, minimum: float, maximum: float) -> float:
    """
    Min-max normalization into [0, 1].
    """

    if maximum <= minimum:
        return 0.0

    return max(
        0.0,
        min(
            1.0,
            (value - minimum) / (maximum - minimum),
        ),
    )


def _lift_score(lift: float) -> float:
    """
    Convert lift into a bounded [0, 1] score.

    lift / (1 + lift)

    This prevents unusually large lift values from
    dominating the final recommendation score.
    """

    if lift <= 0:
        return 0.0

    return lift / (1.0 + lift)


def _market_basket_score(
    confidence: float,
    lift: float,
) -> float:
    """
    Combine confidence and lift into one bounded
    Market Basket score.
    """

    confidence_score = max(
        0.0,
        min(1.0, confidence),
    )

    lift_score = _lift_score(lift)

    return (
        0.70 * confidence_score
        + 0.30 * lift_score
    )


def _build_product_affinity(
    customer_id,
    purchased_products,
    request,
):
    """
    Estimate customer-specific affinity for candidate products
    using item-level co-purchase patterns.

    For every other customer who shares at least one purchased
    product with this customer, we credit the other products
    that customer bought, weighted by the size of the overlap.
    This gives a product-specific signal that is more granular
    than category affinity, without duplicating the market
    basket association-rule signal.

    Values are normalized to [0, 1].
    """

    if not purchased_products:
        return {}

    other_customer_products = defaultdict(set)

    for order in request.orders:

        if order.customerId == customer_id:
            continue

        other_customer_products[order.customerId].add(
            order.productId
        )

    co_occurrence = Counter()

    for other_products in other_customer_products.values():

        overlap = purchased_products & other_products

        if not overlap:
            continue

        for product_id in other_products:

            if product_id in purchased_products:
                continue

            co_occurrence[product_id] += len(overlap)

    if not co_occurrence:
        return {}

    maximum = max(co_occurrence.values())

    if maximum <= 0:
        return {}

    return {
        product_id: round(count / maximum, 4)
        for product_id, count in co_occurrence.items()
    }


def _build_product_map(request):
    return {
        product.productId: product
        for product in request.products
    }


def _build_customer_history(request):
    """
    customerId -> set(productId)
    """

    history = defaultdict(set)

    for order in request.orders:
        history[order.customerId].add(
            order.productId
        )

    return history


def _build_product_popularity(request):
    """
    Count how many customers/orders purchased each product.

    We use unique customer-product interactions so one
    customer repeatedly buying the same product does not
    artificially dominate popularity.
    """

    customer_product_pairs = set()

    for order in request.orders:
        customer_product_pairs.add(
            (
                order.customerId,
                order.productId,
            )
        )

    popularity = Counter(
        product_id
        for _, product_id in customer_product_pairs
    )

    return popularity


def _normalize_popularity(popularity):
    if not popularity:
        return {}

    maximum = max(popularity.values())

    if maximum <= 0:
        return {
            product_id: 0.0
            for product_id in popularity
        }

    return {
        product_id: count / maximum
        for product_id, count in popularity.items()
    }


def _build_global_category_preference(
    request,
):
    """
    Calculate global category preference across
    all customer-product interactions.

    Scores represent the proportion of observed
    customer-product interactions belonging to
    each category.
    """

    customer_product_pairs = set()

    for order in request.orders:
        customer_product_pairs.add(
            (
                order.customerId,
                order.productId,
            )
        )

    category_counts = Counter()
    total = 0

    product_map = _build_product_map(request)

    for _, product_id in customer_product_pairs:

        product = product_map.get(product_id)

        if not product or not product.category:
            continue

        category_counts[product.category] += 1
        total += 1

    if total <= 0:
        return {}

    return {
        category: round(
            count / total,
            4,
        )
        for category, count in category_counts.items()
    }


def _build_category_affinity(
    customer_id,
    purchased_products,
    product_map,
):
    """
    Calculate customer category preference.

    Preference is based on the proportion of the customer's
    purchased products belonging to each category.

    Values are normalized to [0, 1].
    """

    category_counts = Counter()

    for product_id in purchased_products:

        product = product_map.get(product_id)

        if not product:
            continue

        category = (
            product.category
            or "Uncategorized"
        )

        category_counts[category] += 1

    total = sum(category_counts.values())

    if total == 0:
        return {}

    return {
        category: round(count / total, 4)
        for category, count in category_counts.items()
    }



def _build_market_basket_candidates(
    purchased,
    rules,
    product_map,
):
    """
    Build candidate -> aggregated Market Basket score.

    If multiple rules recommend the same product,
    retain the strongest signal while also preserving
    the rule responsible for the recommendation.
    """

    candidates = {}

    for rule in rules:

        antecedent = set(rule.antecedents)

        if not antecedent.issubset(purchased):
            continue

        basket_score = _market_basket_score(
            rule.confidence,
            rule.lift,
        )

        for product_id in rule.consequents:

            if product_id in purchased:
                continue

            if product_id not in product_map:
                continue

            existing = candidates.get(product_id)

            if (
                existing is None
                or basket_score > existing["score"]
            ):
                antecedent_names = [
                    product_map[item_id].productName
                    for item_id in rule.antecedents
                    if item_id in product_map
                ]

                candidates[product_id] = {
                    "score": basket_score,
                    "antecedents": antecedent_names,
                    "confidence": rule.confidence,
                    "lift": rule.lift,
                }

    return candidates


def _calculate_personalized_score(
    basket_score,
    preference_score,
    popularity_score,
):
    return (
        MARKET_BASKET_WEIGHT
        * basket_score
        + CUSTOMER_PREFERENCE_WEIGHT
        * preference_score
        + POPULARITY_WEIGHT
        * popularity_score
    )


def _calculate_cold_start_score(
    popularity_score,
    global_preference_score,
):
    return (
        COLD_START_POPULARITY_WEIGHT
        * popularity_score
        + COLD_START_GLOBAL_PREFERENCE_WEIGHT
        * global_preference_score
    )


def _build_reason(
    *,
    basket_signal,
    preference_score,
    popularity_score,
    product,
):
    """
    Generate an interpretable recommendation explanation.
    """

    # -------------------------------------------------
    # MARKET BASKET
    # -------------------------------------------------

    if basket_signal is not None:

        antecedents = basket_signal.get(
            "antecedents",
            [],
        )

        if antecedents:

            if len(antecedents) == 1:
                source = antecedents[0]

            elif len(antecedents) == 2:
                source = (
                    f"{antecedents[0]} and "
                    f"{antecedents[1]}"
                )

            else:
                source = ", ".join(
                    antecedents[:3]
                )

            return f"Frequently purchased with {source}"

        return "Frequently purchased with previous products"

    # -------------------------------------------------
    # CUSTOMER CATEGORY PREFERENCE
    # -------------------------------------------------

    if (
        product.category
        and preference_score >= 0.50
    ):
        return (
            f"Matches your interest in "
            f"{product.category}"
        )

    # -------------------------------------------------
    # CATEGORY-LEVEL PREFERENCE
    # -------------------------------------------------

    if (
        product.category
        and preference_score >= 0.25
    ):
        return (
            f"Based on your "
            f"{product.category} preferences"
        )

    # -------------------------------------------------
    # POPULARITY
    # -------------------------------------------------

    if (
        product.category
        and popularity_score >= 0.50
    ):
        return (
            f"Popular in the "
            f"{product.category} category"
        )

    if popularity_score > 0:
        return "Popular among customers"

    return (
        "Recommended based on available "
        "customer purchase patterns"
    )


def _apply_diversity(
    candidates,
    product_map,
):
    """
    Select up to TOP_K recommendations, first maximizing
    category coverage, then filling any remaining slots
    with the highest-scoring unused candidates while still
    respecting MAX_RECOMMENDATIONS_PER_CATEGORY.
    """

    sorted_candidates = sorted(
        candidates,
        key=lambda item: (
            item["final_score"],
            item["basket_score"],
            item["preference_score"],
            item["popularity_score"],
            item["product_id"],
        ),
        reverse=True,
    )

    selected = []
    selected_ids = set()
    category_counts = Counter()

    # -------------------------------------------------
    # PASS 1
    # First pass allows only one product
    # from each category.
    # -------------------------------------------------

    for candidate in sorted_candidates:

        if len(selected) >= TOP_K:
            break

        product = product_map.get(
            candidate["product_id"]
        )

        if not product:
            continue

        category = (
            product.category
            or "Uncategorized"
        )

        if category_counts[category] > 0:
            continue

        selected.append(candidate)
        selected_ids.add(
            candidate["product_id"]
        )
        category_counts[category] += 1

    # -------------------------------------------------
    # PASS 2
    # Fill remaining slots.
    # -------------------------------------------------

    if len(selected) < TOP_K:

        for candidate in sorted_candidates:

            if len(selected) >= TOP_K:
                break

            product_id = candidate[
                "product_id"
            ]

            if product_id in selected_ids:
                continue

            product = product_map.get(
                product_id
            )

            if not product:
                continue

            category = (
                product.category
                or "Uncategorized"
            )

            # Absolute hard limit.
            if (
                category_counts[category]
                >= MAX_RECOMMENDATIONS_PER_CATEGORY
            ):
                continue

            selected.append(candidate)
            selected_ids.add(
                product_id
            )
            category_counts[category] += 1

    return selected


def generate_recommendations(
    request: RecommendationRequest,
) -> RecommendationResponse:

    product_map = _build_product_map(request)

    customer_history = _build_customer_history(
        request
    )

    popularity = _build_product_popularity(
        request
    )

    normalized_popularity = _normalize_popularity(
        popularity
    )

    global_category_preference = (
        _build_global_category_preference(
            request
        )
    )

    recommendations = []

    # ---------------------------------------------------------
    # CUSTOMER LOOP
    # ---------------------------------------------------------

    for customer in request.customers:

        purchased = customer_history.get(
            customer.customerId,
            set(),
        )

        history_size = len(purchased)

        is_personalized = (
            history_size
            >= MIN_HISTORY_FOR_PERSONALIZED_MODEL
        )

        category_affinity = (
            _build_category_affinity(
                customer.customerId,
                purchased,
                product_map,
            )
        )

        product_affinity = (
            _build_product_affinity(
                customer.customerId,
                purchased,
                request,
            )
        )

        # -----------------------------------------------------
        # MARKET BASKET SIGNAL
        # -----------------------------------------------------

        basket_candidates = (
            _build_market_basket_candidates(
                purchased,
                request.marketBasketRules,
                product_map,
            )
        )

        candidate_scores = []

        # -----------------------------------------------------
        # GENERATE CANDIDATES
        # -----------------------------------------------------

        for product_id, product in product_map.items():

            # HARD CONSTRAINT:
            # Never recommend something already purchased.
            if product_id in purchased:
                continue

            basket_signal = basket_candidates.get(
                product_id
            )

            basket_score = (
                basket_signal["score"]
                if basket_signal
                else 0.0
            )

            popularity_score = (
                normalized_popularity.get(
                    product_id,
                    0.0,
                )
            )

            category_affinity_score = (
                category_affinity.get(
                    product.category,
                    0.0,
                )
                if product.category
                else 0.0
            )

            product_affinity_score = (
                product_affinity.get(
                    product_id,
                    0.0,
                )
            )

            # Candidate-specific preference score:
            # product-level affinity dominates, category
            # affinity fills in when product-level signal
            # is unavailable or weak.
            preference_score = (
                0.60 * product_affinity_score
                + 0.40 * category_affinity_score
            )

            global_preference_score = (
                global_category_preference.get(
                    product.category,
                    0.0,
                )
                if product.category
                else 0.0
            )

            # -------------------------------------------------
            # PERSONALIZED CUSTOMER
            # -------------------------------------------------

            if is_personalized:

                final_score = (
                    _calculate_personalized_score(
                        basket_score,
                        preference_score,
                        popularity_score,
                    )
                )

            # -------------------------------------------------
            # COLD START CUSTOMER
            # -------------------------------------------------

            else:

                final_score = (
                    _calculate_cold_start_score(
                        popularity_score,
                        global_preference_score,
                    )
                )

            reason = _build_reason(
                basket_signal=basket_signal,
                preference_score=(
                    preference_score
                    if is_personalized
                    else global_preference_score
                ),
                popularity_score=popularity_score,
                product=product,
            )

            candidate_scores.append(
                {
                    "product_id": product_id,
                    "final_score": final_score,
                    "basket_score": basket_score,
                    "preference_score": (
                        preference_score
                        if is_personalized
                        else global_preference_score
                    ),
                    "popularity_score": popularity_score,
                    "basket_signal": basket_signal,
                    "reason": reason,
                }
            )

        # -----------------------------------------------------
        # DIVERSITY-AWARE RANKING
        # -----------------------------------------------------

        selected = _apply_diversity(
            candidate_scores,
            product_map,
        )

        customer_recommendations = []

        for candidate in selected:

            customer_recommendations.append(
                RecommendedProduct(
                    productId=candidate[
                        "product_id"
                    ],
                    score=round(
                        candidate[
                            "final_score"
                        ],
                        4,
                    ),
                    reason=candidate[
                        "reason"
                    ],
                )
            )

        recommendations.append(
            CustomerRecommendation(
                customerId=customer.customerId,
                recommendedProducts=(
                    customer_recommendations
                ),
            )
        )

    # ---------------------------------------------------------
    # RESPONSE
    # ---------------------------------------------------------

    return RecommendationResponse(
        success=True,
        algorithm="Hybrid Recommendation",
        modelVersion=MODEL_VERSION,
        recommendationCount=sum(
            len(
                recommendation.recommendedProducts
            )
            for recommendation in recommendations
        ),
        recommendations=recommendations,
    )