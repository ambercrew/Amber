let
  nixpkgs = fetchTarball "https://github.com/NixOS/nixpkgs/tarball/nixos-25.11";
  pkgs = import nixpkgs { config = {}; overlays = []; };
in
pkgs.mkShell {
  nativeBuildInputs = with pkgs; [
    cargo
    cargo-expand
    cargo-tauri
    clippy
    electron
    gobject-introspection
    nodejs
    pkg-config
    rustc
    sqlx-cli
    vscode-extensions.vadimcn.vscode-lldb
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
  ];

  GIO_MODULE_DIR = "${pkgs.glib-networking}/lib/gio/modules/";
  WEBKIT_DISABLE_DMABUF_RENDERER = 1;
  XDG_DATA_DIRS = "${pkgs.gsettings-desktop-schemas}/share/gsettings-schemas/${pkgs.gsettings-desktop-schemas.name}:${pkgs.gtk3}/share/gsettings-schemas/${pkgs.gtk3.name}:$XDG_DATA_DIRS";

  # Used for React dev-tools.
  ELECTRON_OVERRIDE_DIST_PATH = "${pkgs.electron}/bin/";
}
