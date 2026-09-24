import numpy as np
import pandas as pd

from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler


FEATURE_COLUMNS = [
    "recency",
    "frequency",
    "monetary",
    "averageOrderValue",
]


def run_segmentation(customers: list[dict]) -> dict:
    if not customers:
        raise ValueError("No customer data was provided.")

    dataframe = pd.DataFrame(customers)

    if len(dataframe) < 2:
        raise ValueError(
            "At least two customers are required for segmentation."
        )

    features = dataframe[FEATURE_COLUMNS].copy()

    features = features.replace(
        [np.inf, -np.inf],
        np.nan,
    )

    if features.isnull().any().any():
        raise ValueError(
            "Customer features contain missing or invalid values."
        )

    scaler = StandardScaler()

    scaled_features = scaler.fit_transform(
        features
    )

    # Never request more clusters than customers.
    cluster_count = min(
        3,
        len(dataframe),
    )

    model = KMeans(
        n_clusters=cluster_count,
        random_state=42,
        n_init=10,
    )

    clusters = model.fit_predict(
        scaled_features
    )

    dataframe["cluster"] = clusters

    segment_names = build_segment_names(
        dataframe
    )

    results = []

    for _, customer in dataframe.iterrows():
        cluster = int(
            customer["cluster"]
        )

        results.append(
            {
                "customerId": customer[
                    "customerId"
                ],
                "cluster": cluster,
                "segmentName": segment_names[
                    cluster
                ],
            }
        )

    return {
        "success": True,
        "clusterCount": cluster_count,
        "customers": results,
    }


def build_segment_names(
    dataframe: pd.DataFrame,
) -> dict[int, str]:
    cluster_profiles = (
        dataframe
        .groupby("cluster")
        .agg(
            recency=("recency", "mean"),
            frequency=("frequency", "mean"),
            monetary=("monetary", "mean"),
            averageOrderValue=(
                "averageOrderValue",
                "mean",
            ),
        )
    )

    # Higher monetary/frequency and lower recency
    # indicate stronger customers.
    scores = {}

    for cluster, profile in (
        cluster_profiles.iterrows()
    ):
        score = (
            profile["monetary"]
            + profile["frequency"] * 100
            - profile["recency"] * 10
        )

        scores[int(cluster)] = float(
            score
        )

    ranked_clusters = sorted(
        scores,
        key=scores.get,
        reverse=True,
    )

    names = {}

    labels = [
        "High Value",
        "Regular",
        "At Risk",
    ]

    for index, cluster in enumerate(
        ranked_clusters
    ):
        names[cluster] = labels[
            min(
                index,
                len(labels) - 1,
            )
        ]

    return names