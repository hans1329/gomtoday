-- Create friend_requests table
CREATE TABLE public.friend_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_user_id UUID NOT NULL,
  to_user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(from_user_id, to_user_id)
);

-- Enable RLS
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own sent and received requests
CREATE POLICY "Users can view their friend requests"
ON public.friend_requests
FOR SELECT
USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

-- Users can create friend requests
CREATE POLICY "Users can send friend requests"
ON public.friend_requests
FOR INSERT
WITH CHECK (auth.uid() = from_user_id);

-- Users can update requests sent to them
CREATE POLICY "Users can respond to friend requests"
ON public.friend_requests
FOR UPDATE
USING (auth.uid() = to_user_id);

-- Users can delete their own sent requests
CREATE POLICY "Users can delete their sent requests"
ON public.friend_requests
FOR DELETE
USING (auth.uid() = from_user_id);

-- Add updated_at trigger
CREATE TRIGGER update_friend_requests_updated_at
BEFORE UPDATE ON public.friend_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();