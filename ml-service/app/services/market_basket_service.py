from __future__ import annotations

from itertools import combinations
from typing import Iterable

from app.schemas.market_basket import (
    AssociationRule,
    FrequentItemset,
    MarketBasketAnalysisRequest,
    MarketBasketAnalysisResponse,
)


MODEL_VERSION = "apriori-market-basket-v1"
ALGORITHM = "apriori"


def _normalize_transaction(
    items: Iterable[str],
) -> frozenset[str]:
    """
    Normalize a transaction.

    - Removes duplicate products within the same order.
    - Removes blank product identifiers.
    - Strips surrounding whitespace.
    """

    normalized = {
        str(item).strip()
        for item in items
        if str(item).strip()
    }

    return frozenset(normalized)


def _support_count(
    candidate: frozenset[str],
    transactions: list[frozenset[str]],
) -> int:
    """
    Return the number of transactions containing
    the candidate itemset.
    """

    return sum(
        1
        for transaction in transactions
        if candidate.issubset(transaction)
    )


def _generate_candidates(
    previous_level: set[frozenset[str]],
    candidate_size: int,
) -> set[frozenset[str]]:
    """
    Generate candidate itemsets for the next
    Apriori iteration.
    """

    candidates: set[frozenset[str]] = set()

    previous_list = list(previous_level)

    for index, left in enumerate(previous_list):
        for right in previous_list[index + 1:]:
            merged = left | right

            if len(merged) != candidate_size:
                continue

            # Apriori pruning:
            # every (k - 1)-subset of a frequent
            # k-item candidate must itself be frequent.
            valid_candidate = True

            for subset in combinations(
                sorted(merged),
                candidate_size - 1,
            ):
                if frozenset(subset) not in previous_level:
                    valid_candidate = False
                    break

            if valid_candidate:
                candidates.add(merged)

    return candidates


def _calculate_frequent_itemsets(
    transactions: list[frozenset[str]],
    min_support: float,
) -> dict[frozenset[str], tuple[int, float]]:
    """
    Discover frequent itemsets using the Apriori
    candidate-generation strategy.

    Returned dictionary:

        itemset -> (support_count, support)
    """

    transaction_count = len(transactions)

    if transaction_count == 0:
        return {}

    unique_products = sorted(
        {
            item
            for transaction in transactions
            for item in transaction
        }
    )

    frequent_itemsets: dict[
        frozenset[str],
        tuple[int, float],
    ] = {}

    current_level: set[frozenset[str]] = set()

    # -------------------------------------------------
    # Frequent 1-itemsets
    # -------------------------------------------------

    for product in unique_products:
        candidate = frozenset([product])

        count = _support_count(
            candidate,
            transactions,
        )

        support = count / transaction_count

        if support >= min_support:
            current_level.add(candidate)

            frequent_itemsets[candidate] = (
                count,
                support,
            )

    # -------------------------------------------------
    # Frequent k-itemsets
    # -------------------------------------------------

    candidate_size = 2

    while current_level:
        candidates = _generate_candidates(
            current_level,
            candidate_size,
        )

        if not candidates:
            break

        next_level: set[frozenset[str]] = set()

        for candidate in candidates:
            count = _support_count(
                candidate,
                transactions,
            )

            support = count / transaction_count

            if support >= min_support:
                next_level.add(candidate)

                frequent_itemsets[candidate] = (
                    count,
                    support,
                )

        current_level = next_level
        candidate_size += 1

    return frequent_itemsets


def _calculate_association_rules(
    frequent_itemsets: dict[
        frozenset[str],
        tuple[int, float],
    ],
    min_confidence: float,
) -> list[AssociationRule]:
    """
    Generate association rules from frequent
    itemsets.

    confidence(A -> B)
        = support(A union B) / support(A)

    lift(A -> B)
        = confidence(A -> B) / support(B)
    """

    rules: list[AssociationRule] = []

    for itemset, (_, itemset_support) in (
        frequent_itemsets.items()
    ):
        if len(itemset) < 2:
            continue

        sorted_items = sorted(itemset)

        # Generate every non-empty proper antecedent.
        for antecedent_size in range(
            1,
            len(sorted_items),
        ):
            for antecedent_tuple in combinations(
                sorted_items,
                antecedent_size,
            ):
                antecedent = frozenset(
                    antecedent_tuple
                )

                consequent = (
                    itemset - antecedent
                )

                antecedent_data = (
                    frequent_itemsets.get(
                        antecedent
                    )
                )

                consequent_data = (
                    frequent_itemsets.get(
                        consequent
                    )
                )

                if (
                    antecedent_data is None
                    or consequent_data is None
                ):
                    continue

                antecedent_support = (
                    antecedent_data[1]
                )

                consequent_support = (
                    consequent_data[1]
                )

                if antecedent_support <= 0:
                    continue

                confidence = (
                    itemset_support
                    / antecedent_support
                )

                if confidence < min_confidence:
                    continue

                lift = (
                    confidence
                    / consequent_support
                    if consequent_support > 0
                    else 0.0
                )

                rules.append(
                    AssociationRule(
                        antecedents=sorted(
                            antecedent
                        ),
                        consequents=sorted(
                            consequent
                        ),
                        support=round(
                            itemset_support,
                            4,
                        ),
                        confidence=round(
                            confidence,
                            4,
                        ),
                        lift=round(
                            lift,
                            4,
                        ),
                    )
                )

    # Most useful rules first.
    #
    # Primary:
    #   lift
    #
    # Secondary:
    #   confidence
    #
    # Tertiary:
    #   support

    rules.sort(
        key=lambda rule: (
            rule.lift,
            rule.confidence,
            rule.support,
        ),
        reverse=True,
    )

    return rules


def analyze_market_basket(
    request: MarketBasketAnalysisRequest,
) -> MarketBasketAnalysisResponse:
    """
    Run Apriori-style market basket analysis.

    Each order is treated as one transaction.

    Duplicate product IDs inside an individual
    transaction are ignored because association
    analysis operates on item presence rather
    than quantity.
    """

    transactions = [
        _normalize_transaction(
            transaction.items
        )
        for transaction in request.transactions
    ]

    # Ignore transactions that became empty after
    # normalization.

    transactions = [
        transaction
        for transaction in transactions
        if transaction
    ]

    transaction_count = len(transactions)

    unique_products = {
        product
        for transaction in transactions
        for product in transaction
    }

    unique_product_count = len(
        unique_products
    )

    if transaction_count == 0:
        return MarketBasketAnalysisResponse(
            success=True,
            algorithm=ALGORITHM,
            modelVersion=MODEL_VERSION,
            transactionCount=0,
            uniqueProductCount=0,
            frequentItemsetCount=0,
            associationRuleCount=0,
            averageConfidence=0.0,
            maximumLift=0.0,
            strongestRule=None,
            frequentItemsets=[],
            rules=[],
        )

    frequent_itemsets_map = (
        _calculate_frequent_itemsets(
            transactions=transactions,
            min_support=request.minSupport,
        )
    )

    rules = _calculate_association_rules(
        frequent_itemsets=(
            frequent_itemsets_map
        ),
        min_confidence=(
            request.minConfidence
        ),
    )

    frequent_itemsets = [
        FrequentItemset(
            items=sorted(itemset),
            support=round(
                support,
                4,
            ),
            count=count,
        )
        for itemset, (
            count,
            support,
        ) in frequent_itemsets_map.items()
    ]

    frequent_itemsets.sort(
        key=lambda item: (
            len(item.items),
            -item.support,
            item.items,
        )
    )

    if rules:
        average_confidence = (
            sum(
                rule.confidence
                for rule in rules
            )
            / len(rules)
        )

        maximum_lift = max(
            rule.lift
            for rule in rules
        )

        strongest_rule = rules[0]

    else:
        average_confidence = 0.0
        maximum_lift = 0.0
        strongest_rule = None

    return MarketBasketAnalysisResponse(
        success=True,
        algorithm=ALGORITHM,
        modelVersion=MODEL_VERSION,
        transactionCount=(
            transaction_count
        ),
        uniqueProductCount=(
            unique_product_count
        ),
        frequentItemsetCount=len(
            frequent_itemsets
        ),
        associationRuleCount=len(
            rules
        ),
        averageConfidence=round(
            average_confidence,
            4,
        ),
        maximumLift=round(
            maximum_lift,
            4,
        ),
        strongestRule=(
            strongest_rule
        ),
        frequentItemsets=(
            frequent_itemsets
        ),
        rules=rules,
    )