# This image is for a custom toolchain for RBE in GCP.
# See: https://cloud.google.com/remote-build-execution/docs/create-custom-toolchain?authuser=0#use_the_rbe_ubuntu16-04_container_as_base

FROM gcr.io/cloud-marketplace/google/rbe-ubuntu16-04@sha256:4bfd33aa9ce73e28718385b8c01608a79bc6546906f01cf9329311cace1766a1

RUN wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
RUN dpkg -i google-chrome-stable_current_amd64.deb; apt-get -fy install
ENV CHROME_PATH=/usr/bin/google-chrome
