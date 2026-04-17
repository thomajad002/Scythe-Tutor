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
    label: "SCYTHE TUTOR",
    href: "/",
  },
  commonItems: [
    { label: "Home", href: "/" },
  ],
  authenticatedItems: [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Tutor", href: "/tutor" },
    { label: "Buy", href: "/buy" },
    { label: "Profile", href: "/profile" },
  ],
  unauthenticatedItems: [
    { label: "Login", href: "/login" },
    { label: "Sign Up", href: "/signup" },
  ],
};
