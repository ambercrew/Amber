fn main() {
    prost_build::compile_protos(&["protobuff/sync_objects.proto"], &["protobuff/"]).unwrap();
}
