"""Extract code repository URLs from paper abstracts."""

import re


# Pattern to match GitHub URLs in text
GITHUB_URL_PATTERN = re.compile(
    r"https?://(?:www\.)?github\.com/[\w\-\.]+/[\w\-\.]+",
    re.IGNORECASE,
)


def get_code_url_from_abstract(abstract: str | None) -> str | None:
    """Extract code URL from paper abstract.

    Many ML papers include phrases like "code available at github.com/..."
    in their abstracts.

    Parameters
    ----------
    abstract : str | None
        The paper's abstract text.

    Returns
    -------
    str | None
        URL of the code repository, or None if not found.
    """
    if not abstract:
        return None

    match = GITHUB_URL_PATTERN.search(abstract)
    if match:
        url = match.group(0)
        # Clean up trailing punctuation that might have been captured
        url = url.rstrip(".,;:)")
        return url

    return None
