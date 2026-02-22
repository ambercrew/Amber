use proc_macro::TokenStream;
use quote::quote;
use syn::{
    Data, DeriveInput, Fields, GenericArgument, PathArguments, Type, TypePath, parse_macro_input,
};

#[proc_macro_derive(ScopeInjectable, attributes(injector_scope))]
pub fn derive_from_injector_scope(input: TokenStream) -> TokenStream {
    let input = parse_macro_input!(input as DeriveInput);
    let struct_name = &input.ident;

    let fields = match &input.data {
        Data::Struct(data) => match &data.fields {
            Fields::Named(fields) => &fields.named,
            _ => panic!("ScopeInjectable only supports named fields"),
        },
        _ => panic!("ScopeInjectable only supports structs"),
    };

    let resolve_fields = fields.iter().map(|f| {
        let field_name = f.ident.as_ref().unwrap();
        let field_type = &f.ty;

        let inner_type = if let Type::Path(TypePath { path, .. }) = field_type {
            if path
                .segments
                .last()
                .map(|s| s.ident == "Arc")
                .unwrap_or(false)
            {
                if let PathArguments::AngleBracketed(args) =
                    &path.segments.last().unwrap().arguments
                {
                    if let Some(GenericArgument::Type(inner)) = args.args.first() {
                        inner
                    } else {
                        field_type
                    }
                } else {
                    field_type
                }
            } else {
                field_type
            }
        } else {
            field_type
        };

        quote! {
            let #field_name = scope.resolve::<#inner_type>().await;
        }
    });

    let field_names = fields.iter().map(|f| f.ident.as_ref().unwrap());

    let expanded = quote! {
        #[async_trait::async_trait]
        impl injector::injector_scope::ScopeInjectable for #struct_name {
            async fn from_injector_scope(
                scope: &injector::injector_scope::InjectorScope<'_>
            ) -> Self {
                #(#resolve_fields)*
                Self {
                    #(#field_names),*
                }
            }
        }
    };

    TokenStream::from(expanded)
}
