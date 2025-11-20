-- Add subscription fields to pencil_products table
ALTER TABLE pencil_products 
ADD COLUMN product_type text NOT NULL DEFAULT 'one_time',
ADD COLUMN subscription_interval text,
ADD COLUMN subscription_interval_count integer,
ADD CONSTRAINT check_product_type CHECK (product_type IN ('one_time', 'subscription')),
ADD CONSTRAINT check_subscription_interval CHECK (
  (product_type = 'one_time' AND subscription_interval IS NULL AND subscription_interval_count IS NULL) OR
  (product_type = 'subscription' AND subscription_interval IN ('day', 'week', 'month', 'year') AND subscription_interval_count > 0)
);

-- Add comment for clarity
COMMENT ON COLUMN pencil_products.product_type IS 'Type of product: one_time for single purchase, subscription for recurring';
COMMENT ON COLUMN pencil_products.subscription_interval IS 'Interval for subscription: day, week, month, or year';
COMMENT ON COLUMN pencil_products.subscription_interval_count IS 'Number of intervals (e.g., 1 for monthly, 3 for quarterly)';