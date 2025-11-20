-- Create invitations table
CREATE TABLE public.invitations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inviter_id uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  invitee_id uuid REFERENCES profiles(user_id) ON DELETE SET NULL,
  invitation_code text NOT NULL UNIQUE,
  used boolean NOT NULL DEFAULT false,
  used_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own invitations"
ON public.invitations
FOR SELECT
USING (auth.uid() = inviter_id);

CREATE POLICY "Users can create their own invitations"
ON public.invitations
FOR INSERT
WITH CHECK (auth.uid() = inviter_id);

CREATE POLICY "System can update invitations"
ON public.invitations
FOR UPDATE
USING (true);

-- Add invitation bonus settings to pencil_settings
INSERT INTO public.pencil_settings (setting_key, setting_value, description)
VALUES 
  ('invitation_bonus_inviter', 5, '초대한 사람이 받는 연필 보너스'),
  ('invitation_bonus_invitee', 3, '초대받은 사람이 받는 연필 보너스');

-- Add initial invitations count to profiles
ALTER TABLE public.profiles
ADD COLUMN invitation_count integer NOT NULL DEFAULT 6;

-- Function to handle invitation signup
CREATE OR REPLACE FUNCTION public.handle_invitation_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invitation_bonus_inviter integer;
  invitation_bonus_invitee integer;
  inviter_user_id uuid;
BEGIN
  -- Check if user signed up with invitation code
  IF NEW.raw_user_meta_data->>'invitation_code' IS NOT NULL THEN
    -- Get bonus amounts
    SELECT setting_value INTO invitation_bonus_inviter
    FROM public.pencil_settings
    WHERE setting_key = 'invitation_bonus_inviter';
    
    SELECT setting_value INTO invitation_bonus_invitee
    FROM public.pencil_settings
    WHERE setting_key = 'invitation_bonus_invitee';
    
    -- Find and update invitation
    UPDATE public.invitations
    SET used = true, used_at = now(), invitee_id = NEW.id
    WHERE invitation_code = NEW.raw_user_meta_data->>'invitation_code'
      AND used = false
    RETURNING inviter_id INTO inviter_user_id;
    
    -- Give bonus to inviter
    IF inviter_user_id IS NOT NULL THEN
      UPDATE public.profiles
      SET pencil_count = pencil_count + COALESCE(invitation_bonus_inviter, 5)
      WHERE user_id = inviter_user_id;
      
      -- Give bonus to invitee
      UPDATE public.profiles
      SET pencil_count = pencil_count + COALESCE(invitation_bonus_invitee, 3)
      WHERE user_id = NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for invitation signup (runs after handle_new_user)
CREATE TRIGGER on_invitation_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_invitation_signup();