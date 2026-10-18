CREATE SCHEMA IF NOT EXISTS "fastfood_app";
--> statement-breakpoint
CREATE TABLE "fastfood_app"."audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_id" text,
	"actor_role" text NOT NULL,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"details" text,
	"old_values" jsonb,
	"new_values" jsonb,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fastfood_app"."branch_exceptions" (
	"id" text PRIMARY KEY NOT NULL,
	"branch_id" text NOT NULL,
	"date" text NOT NULL,
	"is_closed" boolean DEFAULT true NOT NULL,
	"custom_open_time" text,
	"custom_close_time" text,
	"reason" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fastfood_app"."branch_hours" (
	"id" text PRIMARY KEY NOT NULL,
	"branch_id" text NOT NULL,
	"day_of_week" integer NOT NULL,
	"open_time" text NOT NULL,
	"close_time" text NOT NULL,
	"is_closed" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fastfood_app"."branches" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"address" text NOT NULL,
	"phone" text NOT NULL,
	"email" text NOT NULL,
	"latitude" text NOT NULL,
	"longitude" text NOT NULL,
	"delivery_fee_minor" integer DEFAULT 499 NOT NULL,
	"min_order_minor" integer DEFAULT 1500 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"accept_orders" boolean DEFAULT true NOT NULL,
	"max_capacity_orders_per_hr" integer DEFAULT 60 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "branches_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "fastfood_app"."categories" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"image_url" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "fastfood_app"."coupon_redemptions" (
	"id" text PRIMARY KEY NOT NULL,
	"coupon_id" text NOT NULL,
	"order_id" text NOT NULL,
	"user_id" text,
	"redeemed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"discount_applied_minor" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fastfood_app"."coupons" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"description" text NOT NULL,
	"discount_type" text NOT NULL,
	"discount_value" integer NOT NULL,
	"min_subtotal_minor" integer DEFAULT 0 NOT NULL,
	"max_discount_minor" integer,
	"max_uses_total" integer,
	"max_uses_per_user" integer DEFAULT 1,
	"starts_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "coupons_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "fastfood_app"."delivery_address_snapshot" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"street_address" text NOT NULL,
	"unit" text,
	"city" text NOT NULL,
	"postal_code" text NOT NULL,
	"latitude" text,
	"longitude" text,
	"delivery_instructions" text,
	CONSTRAINT "delivery_address_snapshot_order_id_unique" UNIQUE("order_id")
);
--> statement-breakpoint
CREATE TABLE "fastfood_app"."delivery_zones" (
	"id" text PRIMARY KEY NOT NULL,
	"branch_id" text NOT NULL,
	"zone_name" text NOT NULL,
	"geometry" jsonb NOT NULL,
	"min_order_amount_minor" integer DEFAULT 1500 NOT NULL,
	"delivery_fee_minor" integer DEFAULT 499 NOT NULL,
	"estimated_delivery_minutes" integer DEFAULT 35 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fastfood_app"."menu_item_modifier_groups" (
	"id" text PRIMARY KEY NOT NULL,
	"menu_item_id" text NOT NULL,
	"modifier_group_id" text NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fastfood_app"."menu_items" (
	"id" text PRIMARY KEY NOT NULL,
	"category_id" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text NOT NULL,
	"base_price_minor" integer NOT NULL,
	"image_url" text NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL,
	"is_halal" boolean DEFAULT false NOT NULL,
	"is_gluten_free" boolean DEFAULT false NOT NULL,
	"is_vegan" boolean DEFAULT false NOT NULL,
	"is_vegetarian" boolean DEFAULT false NOT NULL,
	"is_spicy" boolean DEFAULT false NOT NULL,
	"modifier_groups_json" jsonb,
	"display_order" integer DEFAULT 0 NOT NULL,
	"calories" integer DEFAULT 650 NOT NULL,
	"prep_time_minutes" integer DEFAULT 12 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "menu_items_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "fastfood_app"."modifier_groups" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"selection_type" text DEFAULT 'SINGLE' NOT NULL,
	"min_selections" integer DEFAULT 0 NOT NULL,
	"max_selections" integer DEFAULT 1 NOT NULL,
	"is_required" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fastfood_app"."modifier_options" (
	"id" text PRIMARY KEY NOT NULL,
	"modifier_group_id" text NOT NULL,
	"name" text NOT NULL,
	"price_delta_minor" integer DEFAULT 0 NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fastfood_app"."order_events" (
	"id" text PRIMARY KEY NOT NULL,
	"aggregate_type" text DEFAULT 'ORDER' NOT NULL,
	"aggregate_id" text NOT NULL,
	"event_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fastfood_app"."order_item_modifiers" (
	"id" text PRIMARY KEY NOT NULL,
	"order_item_id" text NOT NULL,
	"modifier_option_id" text,
	"group_name_snapshot" text NOT NULL,
	"option_name_snapshot" text NOT NULL,
	"price_delta_minor_snapshot" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fastfood_app"."order_items" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"menu_item_id" text NOT NULL,
	"item_name_snapshot" text NOT NULL,
	"base_price_minor_snapshot" integer NOT NULL,
	"quantity" integer NOT NULL,
	"line_total_minor" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fastfood_app"."order_status_history" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"previous_status" text,
	"new_status" text NOT NULL,
	"changed_by_user_id" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fastfood_app"."orders" (
	"id" text PRIMARY KEY NOT NULL,
	"order_number" text NOT NULL,
	"user_id" text,
	"guest_email" text,
	"guest_phone" text,
	"guest_name" text,
	"tracking_token" text NOT NULL,
	"branch_id" text NOT NULL,
	"service_mode" text NOT NULL,
	"status" text DEFAULT 'PENDING_PAYMENT' NOT NULL,
	"subtotal_minor" integer NOT NULL,
	"discount_minor" integer DEFAULT 0 NOT NULL,
	"delivery_fee_minor" integer DEFAULT 0 NOT NULL,
	"tax_minor" integer NOT NULL,
	"total_minor" integer NOT NULL,
	"notes" text,
	"cancel_reason" text,
	"idempotency_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_order_number_unique" UNIQUE("order_number"),
	CONSTRAINT "orders_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "fastfood_app"."payment_events" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"provider_event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fastfood_app"."payments" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"provider" text NOT NULL,
	"provider_transaction_id" text,
	"provider_intent_id" text,
	"status" text DEFAULT 'REQUIRES_PAYMENT_METHOD' NOT NULL,
	"amount_minor" integer NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"idempotency_key" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "fastfood_app"."user_addresses" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"label" text DEFAULT 'Home' NOT NULL,
	"street_address" text NOT NULL,
	"unit" text,
	"city" text NOT NULL,
	"postal_code" text NOT NULL,
	"latitude" text,
	"longitude" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"delivery_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fastfood_app"."users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"password_hash" text,
	"pin_hash" text,
	"role" text DEFAULT 'CUSTOMER' NOT NULL,
	"full_name" text NOT NULL,
	"branch_id" text DEFAULT 'branch-1',
	"branch_name" text DEFAULT 'Downtown Flagship',
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "fastfood_app"."branch_exceptions" ADD CONSTRAINT "branch_exceptions_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "fastfood_app"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fastfood_app"."branch_hours" ADD CONSTRAINT "branch_hours_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "fastfood_app"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fastfood_app"."coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_coupon_id_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "fastfood_app"."coupons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fastfood_app"."delivery_address_snapshot" ADD CONSTRAINT "delivery_address_snapshot_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "fastfood_app"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fastfood_app"."delivery_zones" ADD CONSTRAINT "delivery_zones_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "fastfood_app"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fastfood_app"."menu_item_modifier_groups" ADD CONSTRAINT "menu_item_modifier_groups_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "fastfood_app"."menu_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fastfood_app"."menu_item_modifier_groups" ADD CONSTRAINT "menu_item_modifier_groups_modifier_group_id_modifier_groups_id_fk" FOREIGN KEY ("modifier_group_id") REFERENCES "fastfood_app"."modifier_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fastfood_app"."menu_items" ADD CONSTRAINT "menu_items_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "fastfood_app"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fastfood_app"."modifier_options" ADD CONSTRAINT "modifier_options_modifier_group_id_modifier_groups_id_fk" FOREIGN KEY ("modifier_group_id") REFERENCES "fastfood_app"."modifier_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fastfood_app"."order_item_modifiers" ADD CONSTRAINT "order_item_modifiers_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "fastfood_app"."order_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fastfood_app"."order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "fastfood_app"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fastfood_app"."order_status_history" ADD CONSTRAINT "order_status_history_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "fastfood_app"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fastfood_app"."orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "fastfood_app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fastfood_app"."orders" ADD CONSTRAINT "orders_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "fastfood_app"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fastfood_app"."payments" ADD CONSTRAINT "payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "fastfood_app"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fastfood_app"."user_addresses" ADD CONSTRAINT "user_addresses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "fastfood_app"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "fastfood_app"."audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_logs_actor_idx" ON "fastfood_app"."audit_logs" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "fastfood_app"."audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "menu_items_cat_order_idx" ON "fastfood_app"."menu_items" USING btree ("category_id","display_order");--> statement-breakpoint
CREATE INDEX "menu_items_slug_idx" ON "fastfood_app"."menu_items" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "order_events_status_created_idx" ON "fastfood_app"."order_events" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "orders_branch_status_idx" ON "fastfood_app"."orders" USING btree ("branch_id","status");--> statement-breakpoint
CREATE INDEX "orders_user_idx" ON "fastfood_app"."orders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "orders_tracking_token_idx" ON "fastfood_app"."orders" USING btree ("tracking_token");--> statement-breakpoint
CREATE INDEX "orders_created_at_idx" ON "fastfood_app"."orders" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_events_provider_event_idx" ON "fastfood_app"."payment_events" USING btree ("provider","provider_event_id");--> statement-breakpoint
CREATE INDEX "payments_order_idx" ON "fastfood_app"."payments" USING btree ("order_id");