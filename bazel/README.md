# Bazel

## Usage

1. [Install bazel](https://docs.bazel.build/versions/master/install.html)
1. auth with gcp: `sudo gcloud auth application-default login --no-launch-browser`
1. install docker ([googlers do this](https://sites.google.com/corp/google.com/raajkumars/home/notes/how-to-install-docker-on-your-glinux))
1. `sudo bazel test :smoke --test_arg=--help`

note: for some reason, `bazel test` can't use docker if not run w/ sudo. so must login with sudo. this should be looked into ...

## Update Toolchain

```sh
docker build . -t gcr.io/google.com/lighthouse-bazel/rbe-lighthouse
docker push gcr.io/google.com/lighthouse-bazel/rbe-lighthouse
```
