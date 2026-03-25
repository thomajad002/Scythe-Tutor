import { render, screen } from "@testing-library/react";
import { Button } from "@/components/ui/button";

describe("Button", () => {
  it("renders button text", () => {
    render(<Button>Click Me</Button>);

    expect(screen.getByRole("button", { name: "Click Me" })).toBeInTheDocument();
  });
});
