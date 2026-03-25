export type NavItem = {
  label: string;
  href: string;
};

export type HeaderNavConfig = {
  brand: {
    label: string;
    href: string;
  };
  commonItems: NavItem[];
  authenticatedItems: NavItem[];
  unauthenticatedItems: NavItem[];
};

export const headerNavConfig: HeaderNavConfig = {
  brand: {
    label: "Starter App",
    href: "/",
  },
  commonItems: [
    { label: "Home", href: "/" },
  ],
  authenticatedItems: [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Tutor", href: "/tutor" },
    { label: "Profile", href: "/profile" },
  ],
  unauthenticatedItems: [
    { label: "Login", href: "/login" },
    { label: "Sign Up", href: "/signup" },
  ],
};
