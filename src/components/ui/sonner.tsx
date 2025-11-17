import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-gradient-to-r group-[.toaster]:from-primary/60 group-[.toaster]:to-primary/40 group-[.toaster]:text-white group-[.toaster]:border-primary/50 group-[.toaster]:shadow-lg group-[.toaster]:backdrop-blur-sm",
          description: "group-[.toast]:text-white/90",
          actionButton: "group-[.toast]:bg-white group-[.toast]:text-primary",
          cancelButton: "group-[.toast]:bg-white/20 group-[.toast]:text-white",
          closeButton: "!bg-white/20 !text-white !border-0 !absolute !top-1/2 !-translate-y-1/2 !right-2 !flex !items-center !justify-center !w-6 !h-6 !min-w-6 !min-h-6",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
