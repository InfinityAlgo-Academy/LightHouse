# Bazel

## Usage

1. [Install bazel](https://docs.bazel.build/versions/master/install.html)
1. install docker ([googlers do this](https://sites.google.com/corp/google.com/raajkumars/home/notes/how-to-install-docker-on-your-glinux))
1. ~add current user to docker group: `sudo usermod -a -G docker $USER` (reset terminal after)~
1. auth with gcp: `gcloud auth application-default login --no-launch-browser`
1. `gcloud config set project google.com:lighthouse-bazel`
1. `gcloud auth configure-docker`
1. `sudo bazel test :smoke --test_arg=--help`. note: for some reason, `bazel test` can't use docker if not run w/ sudo. so must login with sudo. this should be looked into ...

## Update Toolchain

```sh
docker build . -t gcr.io/google.com/lighthouse-bazel/rbe-lighthouse
docker push gcr.io/google.com/lighthouse-bazel/rbe-lighthouse
# Update the digest hash in WORKSPACE. Hash:
docker inspect --format='{{index .RepoDigests 0}}' gcr.io/google.com/lighthouse-bazel/rbe-lighthouse
```

See Chrome version:
```sh
docker run gcr.io/google.com/lighthouse-bazel/rbe-lighthouse /usr/bin/google-chrome --version
```
