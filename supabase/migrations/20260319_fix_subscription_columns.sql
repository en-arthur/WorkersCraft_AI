alter table public.user_subscriptions 
  rename column polar_customer_id to paddle_customer_id;

alter table public.user_subscriptions 
  rename column polar_subscription_id to paddle_subscription_id;
