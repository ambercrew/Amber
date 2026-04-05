let
  nixpkgs = fetchTarball "https://github.com/NixOS/nixpkgs/tarball/nixos-25.11";
  rustOverlaySrc = fetchTarball "https://github.com/oxalica/rust-overlay/archive/master.tar.gz";
  pkgs = import nixpkgs {
    config = {
      android_sdk.accept_license = true;
      allowUnfree = true;
    };
    overlays = [ (import rustOverlaySrc) ];
  };
  rustToolChain = pkgs.rust-bin.stable.latest.default.override {
    targets = [
      "aarch64-linux-android"
      "armv7-linux-androideabi"
      "x86_64-linux-android"
      "i686-linux-android"
    ];
  };

  buildToolsVersionsAndroid = "35.0.0" ;

  androidComposition = pkgs.androidenv.composeAndroidPackages {
    includeNDK = true;
    ndkVersions = [ "29.0.14206865" ];
    buildToolsVersions = [ buildToolsVersionsAndroid ];
    platformVersions = [ "36" ];
    includeEmulator = false;
    includeSystemImages = false;
  };
  androidSdk = androidComposition.androidsdk;
in
pkgs.mkShell rec {
  nativeBuildInputs = with pkgs; [
    rustToolChain
    cargo-expand
    cargo-tauri
    electron
    gobject-introspection
    gradle
    nodejs
    pkg-config
    sqlx-cli
    vscode-extensions.vadimcn.vscode-lldb
    android-studio
    jdk17
  ];
  buildInputs = with pkgs; [
    at-spi2-atk
    atkmm
    cairo
    gdk-pixbuf
    glib
    gtk3
    harfbuzz
    librsvg
    libsoup_3
    pango
    webkitgtk_4_1
    openssl
    androidSdk
  ];

  # Android environment variables.
  ANDROID_HOME = "${androidComposition.androidsdk}/libexec/android-sdk";
  ANDROID_NDK_ROOT = "${ANDROID_HOME}/ndk-bundle";
  GRADLE_OPTS = "-Dorg.gradle.project.android.aapt2FromMavenOverride=${ANDROID_HOME}/build-tools/${buildToolsVersionsAndroid}/aapt2";

  NDK_HOME = "${androidSdk}/libexec/android-sdk/ndk/29.0.14206865";
  JAVA_HOME = "${pkgs.jdk17}";

  # Environment variables for Linux.
  GIO_MODULE_DIR = "${pkgs.glib-networking}/lib/gio/modules/";
  WEBKIT_DISABLE_DMABUF_RENDERER = 1;
  XDG_DATA_DIRS = "${pkgs.gsettings-desktop-schemas}/share/gsettings-schemas/${pkgs.gsettings-desktop-schemas.name}:${pkgs.gtk3}/share/gsettings-schemas/${pkgs.gtk3.name}:$XDG_DATA_DIRS";
  ELECTRON_OVERRIDE_DIST_PATH = "${pkgs.electron}/bin/";
}
