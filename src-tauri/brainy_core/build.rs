fn main() {
    prost_build::compile_protos(
        &["Brainy-protocol-buffer-files/sync_object.proto"],
        &["Brainy-protocol-buffer-files/"],
    )
    .unwrap();
}
