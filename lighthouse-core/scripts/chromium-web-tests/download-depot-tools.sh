# Install depot_tools.

if command -v fetch &> /dev/null
then
  echo "depot_tools already installed"
  exit 0
fi

if [ x"$DEPOT_TOOLS_PATH" == x ]; then
  echo "Error: Environment variable DEPOT_TOOLS_PATH not set"
  exit 1
fi

git clone https://chromium.googlesource.com/chromium/tools/depot_tools.git "$DEPOT_TOOLS_PATH"
