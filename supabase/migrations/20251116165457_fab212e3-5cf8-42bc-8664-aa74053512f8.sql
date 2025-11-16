-- Add foreign key constraints to friend_requests table
ALTER TABLE public.friend_requests
  ADD CONSTRAINT friend_requests_from_user_id_fkey 
  FOREIGN KEY (from_user_id) 
  REFERENCES public.profiles(user_id) 
  ON DELETE CASCADE;

ALTER TABLE public.friend_requests
  ADD CONSTRAINT friend_requests_to_user_id_fkey 
  FOREIGN KEY (to_user_id) 
  REFERENCES public.profiles(user_id) 
  ON DELETE CASCADE;