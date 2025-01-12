export declare const CART_DATA_FRAGMENT = "\n  fragment CartData on Cart {\n    is_virtual\n    email\n    billing_address {\n      city\n      country {\n        code\n        label\n      }\n      firstname\n      lastname\n      company\n      postcode\n      vat_id\n      region {\n        region_id\n        code\n        label\n      }\n      street\n      telephone\n      custom_attributes {\n        ... on AttributeValue {\n          code\n          value\n        }\n      }\n    }\n    shipping_addresses {\n      firstname\n      lastname\n      company\n      street\n      city\n      postcode\n      vat_id\n      region {\n        region_id\n        code\n        label\n      }\n      country {\n        code\n        label\n      }\n      telephone\n      custom_attributes {\n        ... on AttributeValue {\n          code\n          value\n        }\n      }\n      available_shipping_methods {\n        amount {\n          currency\n          value\n        }\n        available\n        carrier_code\n        carrier_title\n        error_message\n        method_code\n        method_title\n        price_excl_tax {\n          value\n          currency\n        }\n        price_incl_tax {\n          value\n          currency\n        }\n      }\n      selected_shipping_method {\n        amount {\n          value\n          currency\n        }\n        carrier_code\n        carrier_title\n        method_code\n        method_title\n      }\n    }\n    available_payment_methods {\n      code\n      title\n    }\n    selected_payment_method {\n      code\n      title\n    }\n    applied_coupons {\n      code\n    }\n    prices {\n      grand_total {\n        value\n        currency\n      }\n      subtotal_excluding_tax {\n        value\n        currency\n      }\n      subtotal_including_tax {\n        value\n        currency\n      }\n      applied_taxes {\n        label\n        amount {\n          currency\n          value\n        }\n      }\n    }\n  }\n";
export declare const CART_SUMMARY_FRAGMENT = "\n  fragment CartSummaryItems on Cart {\n    total_quantity\n    itemsV2(sort: { field: CREATED_AT, order: DESC }) {\n      total_count\n      items {\n        __typename\n        uid\n        product {\n          __typename\n          uid\n          name\n          sku\n          url_key\n          thumbnail {\n            url\n            label\n          }\n          small_image {\n            url\n          }\n          price_range {\n            maximum_price {\n              regular_price {\n                currency\n                value\n              }\n            }\n          }\n          stock_status\n          only_x_left_in_stock\n        }\n        prices {\n          fixed_product_taxes {\n            amount {\n              currency\n              value\n            }\n            label\n          }\n          price {\n            currency\n            value\n          }\n          price_including_tax {\n            currency\n            value\n          }\n          row_total {\n            value\n            currency\n          }\n          row_total_including_tax {\n            value\n            currency\n          }\n          total_item_discount {\n            value\n            currency\n          }\n        }\n        quantity\n        errors {\n          code\n          message\n        }\n        ... on SimpleCartItem {\n          customizable_options {\n            label\n            values {\n              label\n              value\n            }\n          }\n        }\n        ... on VirtualCartItem {\n          customizable_options {\n            label\n            values {\n              label\n              value\n            }\n          }\n        }\n        ... on ConfigurableCartItem {\n          customizable_options {\n            label\n            values {\n              label\n              value\n            }\n          }\n          configurable_options {\n            id\n            configurable_product_option_uid\n            option_label\n            configurable_product_option_value_uid\n            value_label\n            value_id\n          }\n          configured_variant {\n            thumbnail {\n              label\n              url\n            }\n          }\n        }\n        ... on GiftCardCartItem {\n          sender_name\n          sender_email\n          recipient_name\n          recipient_email\n          customizable_options {\n            label\n            values {\n              label\n              value\n            }\n          }\n        }\n        ... on DownloadableCartItem {\n          links {\n            title\n          }\n          customizable_options {\n            label\n            values {\n              label\n              value\n            }\n          }\n        }\n      }\n    }\n  }\n";
export declare const getCartQuery: string;
export declare const getCustomerCartQuery: string;
//# sourceMappingURL=getCart.graphql.d.ts.map