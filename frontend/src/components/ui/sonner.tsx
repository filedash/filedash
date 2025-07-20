import { useTheme } from '../../hooks/use-theme';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme();

  // Convert our theme to sonner's expected format
  const sonnerTheme = theme === 'system' ? 'system' : theme;

  return (
    <Sonner
      theme={sonnerTheme as ToasterProps['theme']}
      className="toaster group"
      style={
        {
          '--normal-bg': 'oklch(var(--popover))',
          '--normal-text': 'oklch(var(--popover-foreground))',
          '--normal-border': 'oklch(var(--border))',
        } as React.CSSProperties
      }
      {...props}
    />
  );
};
export { Toaster };
