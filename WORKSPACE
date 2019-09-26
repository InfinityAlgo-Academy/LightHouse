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

# Install Node.
load("@build_bazel_rules_nodejs//:defs.bzl", "node_repositories")

node_repositories(
    node_version = "10.16.0",
    node_repositories = {
        "10.16.0-darwin_amd64": ("node-v10.16.0-darwin-x64.tar.gz", "node-v10.16.0-darwin-x64", "6c009df1b724026d84ae9a838c5b382662e30f6c5563a0995532f2bece39fa9c"),
        "10.16.0-linux_amd64": ("node-v10.16.0-linux-x64.tar.xz", "node-v10.16.0-linux-x64", "1827f5b99084740234de0c506f4dd2202a696ed60f76059696747c34339b9d48"),
        "10.16.0-windows_amd64": ("node-v10.16.0-win-x64.zip", "node-v10.16.0-win-x64", "aa22cb357f0fb54ccbc06b19b60e37eefea5d7dd9940912675d3ed988bf9a059"),
    },
    node_urls = ["https://nodejs.org/dist/v{version}/{filename}"],
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

# Install Chrome - https://github.com/bazelbuild/rules_webtesting
# load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")
# http_archive(
#     name = "io_bazel_rules_webtesting",
#     sha256 = "9bb461d5ef08e850025480bab185fd269242d4e533bca75bfb748001ceb343c3",
#     urls = [
#         "https://github.com/bazelbuild/rules_webtesting/releases/download/0.3.3/rules_webtesting.tar.gz",
#     ],
# )
# load("@io_bazel_rules_webtesting//web:repositories.bzl", "web_test_repositories")

# web_test_repositories()
# load("@io_bazel_rules_webtesting//web/versioned:browsers-0.3.1.bzl", "org_chromium_chromium", "org_chromium_chromedriver")
# org_chromium_chromium()
# org_chromium_chromedriver()

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

# Creates a default toolchain config for RBE.
# Use this as is if you are using the rbe_ubuntu16_04 container,
# otherwise refer to RBE docs.
load("@bazel_toolchains//rules:rbe_repo.bzl", "rbe_autoconfig")
load("@bazel_toolchains//rules:environments.bzl", "clang_env")

rbe_autoconfig(
    name = "rbe_default",
    # Matches the base image used in the Dockerfile.
    base_container_digest = "sha256:4bfd33aa9ce73e28718385b8c01608a79bc6546906f01cf9329311cace1766a1",
    # Matches the google.com/lighthouse-bazel/rbe-lighthouse image.
    digest = "sha256:484f4d1c0e16001b32f9a1e03732f5fd391273f1d7fee9092a26016bcad9deb5",
    env = clang_env(),
    registry = "gcr.io",
    repository = "google.com/lighthouse-bazel/rbe-lighthouse",
)
