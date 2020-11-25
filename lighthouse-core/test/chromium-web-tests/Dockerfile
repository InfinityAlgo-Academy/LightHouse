# NOTES
# Run with:
#   docker build . -t webtests && echo built && docker run -v "$PWD/../../..:/lh" webtests
# But first, run `yarn test-devtools` on host machine, but then delete .tmp/chromium-web-tests/content-shells
# so that the docker instance will download a proper linux content shell.

FROM node:12-slim
WORKDIR /webtests

RUN apt-get update \
    && apt-get install -y wget gnupg git \
    # && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    # && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
      --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

RUN apt-get update && apt-get install -y python unzip curl
# RUN apt-get update && apt-get install -y xvfb libxss1 x11-utils lib32gcc1 gnupg

RUN apt-get update --fix-missing && apt-get -y upgrade && apt-get install -y git wget gnupg && apt-get clean

RUN apt install -y libcanberra-gtk-module libcanberra-gtk3-module

RUN apt install -y libnss3

RUN apt install -y xvfb x11-utils

RUN apt install -y fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf

# RUN apt-cache search libcgal

# RUN git config --global user.email "you@example.com"
# RUN git config --global user.name "Your Name"

# COPY *.sh blink-tools.patch /webtests/

# ENV DEPOT_TOOLS_PATH "$TEST_DIR/depot-tools"
# ENV DEVTOOLS_PATH ${DEVTOOLS_PATH:-"$TEST_DIR/devtools/devtools-frontend"}
# ENV BLINK_TOOLS_PATH "$TEST_DIR/blink_tools"
# ENV PATH $DEPOT_TOOLS_PATH:$PATH

# RUN bash /webtests/test-locally.sh --help
# RUN bash /webtests/download-depot-tools.sh
# COPY download-content-shell.sh
# COPY download-content-shell.sh

ENV FONTCONFIG_PATH /etc/fonts

CMD [ "bash", "/lh/lighthouse-core/test/chromium-web-tests/test-locally.sh", "--no-show-results", "--disable-breakpad", "--no-retry-failures", "--additional-driver-flag=--no-sandbox"]
