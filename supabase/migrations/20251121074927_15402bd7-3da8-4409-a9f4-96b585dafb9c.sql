-- Enable realtime for profiles table to track pencil_count and invitation_count changes
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;