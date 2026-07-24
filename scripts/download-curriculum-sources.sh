#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RAW_DIR="${SCRIPT_DIR}/../resources/raw"
mkdir -p "${RAW_DIR}"

download() {
  local url="$1"
  local filename="$2"
  echo "Downloading ${filename}..."
  curl --fail --location --retry 3 --output "${RAW_DIR}/${filename}" "${url}"
}

# The machine-readable K-5 dataset is already vendored in the repository.
# These are official human-review and licensing references only.
download \
  "https://corestandards.org/wp-content/uploads/2023/09/Math_Standards1.pdf" \
  "Math_Standards1.pdf"

download \
  "https://corestandards.org/wp-content/uploads/2023/09/ELA_Standards1.pdf" \
  "ELA_Standards1.pdf"

download \
  "https://www.thecorestandards.org/public-license/" \
  "common-core-public-license.html"

echo "Official reference resources downloaded to ${RAW_DIR}"
echo "Use data/curriculum/generated/common-core-k5-standards.json for imports."
