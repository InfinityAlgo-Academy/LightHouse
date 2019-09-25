# Bazel workspace created by @bazel/create 0.37.1

# Declares that this directory is the root of a Bazel workspace.
# See https://docs.bazel.build/versions/master/build-ref.html#workspace
workspace(
    # How this workspace would be referenced with absolute labels from another workspace
    name = "smokehouse",
    # Map the @npm bazel workspace to the node_modules directory.
    # This lets Bazel use the same node_modules as other local tooling.
    managed_directories = {"@npm": ["node_modules"]},
)

# Install the nodejs "bootstrap" package
# This provides the basic tools for running and packaging nodejs programs in Bazel
load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")
http_archive(
    name = "build_bazel_rules_nodejs",
    sha256 = "da217044d24abd16667324626a33581f3eaccabf80985b2688d6a08ed2f864be",
    urls = ["https://github.com/bazelbuild/rules_nodejs/releases/download/0.37.1/rules_nodejs-0.37.1.tar.gz"],
)

# The yarn_install rule runs yarn anytime the package.json or yarn.lock file changes.
# It also extracts and installs any Bazel rules distributed in an npm package.
load("@build_bazel_rules_nodejs//:defs.bzl", "yarn_install")
yarn_install(
    # Name this npm so that Bazel Label references look like @npm//package
    name = "npm",
    package_json = "//:package.json",
    yarn_lock = "//:yarn.lock",
)

# Install any Bazel rules which were extracted earlier by the yarn_install rule.
load("@npm//:install_bazel_dependencies.bzl", "install_bazel_dependencies")
install_bazel_dependencies()

# RBE - https://releases.bazel.build/bazel-toolchains.html
http_archive(
    name = "bazel_toolchains",
    sha256 = "a1e273b6159ae858f53046f5bab9678cffa82a72f0bf0c0a9e4af8fddb91209c",
    strip_prefix = "bazel-toolchains-0.29.6",
    urls = [
        "https://github.com/bazelbuild/bazel-toolchains/releases/download/0.29.6/bazel-toolchains-0.29.6.tar.gz",
        "https://mirror.bazel.build/github.com/bazelbuild/bazel-toolchains/archive/0.29.6.tar.gz",
    ],
)

load("@bazel_toolchains//rules:rbe_repo.bzl", "rbe_autoconfig")

# Creates a default toolchain config for RBE.
# Use this as is if you are using the rbe_ubuntu16_04 container,
# otherwise refer to RBE docs.
rbe_autoconfig(name = "rbe_default")
