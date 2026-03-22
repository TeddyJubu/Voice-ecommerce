import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProductShowcase, type Product, type ProductShowcaseProps } from "../ProductShowcase";

// Mock the ImageWithFallback component
vi.mock("../../figma/ImageWithFallback", () => ({
  ImageWithFallback: ({ src, alt, className }: any) => (
    <img src={src} alt={alt} className={className} data-testid="mock-image" />
  ),
}));

// Mock the pollinations helper
vi.mock("../../../../lib/pollinations", () => ({
  pollinationsImageUrl: (prompt: string, options?: any) => {
    return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${options?.width || 1024}&height=${options?.height || 1024}`;
  },
}));

describe("ProductShowcase", () => {
  const mockProducts: Product[] = [
    {
      title: "Wireless Headphones",
      price: "$99.99",
      rating: 4.5,
      link: "https://example.com/product1",
      source: "Amazon",
      image: "https://example.com/image1.jpg",
    },
    {
      title: "Bluetooth Speaker",
      price: "$49.99",
      rating: 4.2,
      link: "https://example.com/product2",
      source: "Best Buy",
    },
  ];

  describe("Rendering", () => {
    it("renders without crashing", () => {
      render(<ProductShowcase products={mockProducts} />);
      expect(screen.getByText("Wireless Headphones")).toBeInTheDocument();
    });

    it("renders all products", () => {
      render(<ProductShowcase products={mockProducts} />);
      expect(screen.getByText("Wireless Headphones")).toBeInTheDocument();
      expect(screen.getByText("Bluetooth Speaker")).toBeInTheDocument();
    });

    it("renders product prices", () => {
      render(<ProductShowcase products={mockProducts} />);
      expect(screen.getByText("$99.99")).toBeInTheDocument();
      expect(screen.getByText("$49.99")).toBeInTheDocument();
    });

    it("renders product ratings when provided", () => {
      render(<ProductShowcase products={mockProducts} />);
      expect(screen.getByText("4.5")).toBeInTheDocument();
      expect(screen.getByText("4.2")).toBeInTheDocument();
    });

    it("renders product sources when provided", () => {
      render(<ProductShowcase products={mockProducts} />);
      expect(screen.getByText("Amazon")).toBeInTheDocument();
      expect(screen.getByText("Best Buy")).toBeInTheDocument();
    });

    it("renders query header when query is provided", () => {
      render(<ProductShowcase products={mockProducts} query="best headphones" />);
      expect(screen.getByText('Results for "best headphones"')).toBeInTheDocument();
    });

    it("does not render query header when query is not provided", () => {
      render(<ProductShowcase products={mockProducts} />);
      expect(screen.queryByText(/Results for/)).not.toBeInTheDocument();
    });

    it("renders empty state with no products", () => {
      const { container } = render(<ProductShowcase products={[]} />);
      const grid = container.querySelector(".grid");
      expect(grid?.children.length).toBe(0);
    });
  });

  describe("Product images", () => {
    it("renders image when image URL is provided", () => {
      render(<ProductShowcase products={mockProducts} />);
      const images = screen.getAllByTestId("mock-image");
      expect(images.length).toBeGreaterThan(0);
    });

    it("uses imagePrompt to generate image URL when image is not provided", () => {
      const productsWithPrompt: Product[] = [
        {
          title: "Product",
          link: "https://example.com",
          imagePrompt: "wireless headphones on white background",
        },
      ];
      render(<ProductShowcase products={productsWithPrompt} />);
      const image = screen.getByTestId("mock-image");
      expect(image.getAttribute("src")).toContain("wireless%20headphones");
    });

    it("does not render image container when neither image nor imagePrompt is provided", () => {
      const productsWithoutImage: Product[] = [
        {
          title: "Product",
          link: "https://example.com",
          price: "$10",
        },
      ];
      const { container } = render(<ProductShowcase products={productsWithoutImage} />);
      const imageContainers = container.querySelectorAll(".aspect-square");
      expect(imageContainers.length).toBe(0);
    });
  });

  describe("Links", () => {
    it("renders product links with correct href", () => {
      render(<ProductShowcase products={mockProducts} />);
      const link1 = screen.getByRole("link", { name: /Wireless Headphones/i });
      expect(link1).toHaveAttribute("href", "https://example.com/product1");
    });

    it("opens links in new tab", () => {
      render(<ProductShowcase products={mockProducts} />);
      const links = screen.getAllByRole("link");
      links.forEach((link) => {
        expect(link).toHaveAttribute("target", "_blank");
        expect(link).toHaveAttribute("rel", "noopener noreferrer");
      });
    });
  });

  describe("Price display", () => {
    it('displays "Price not found" when price is not provided', () => {
      const productsWithoutPrice: Product[] = [
        {
          title: "Product",
          link: "https://example.com",
        },
      ];
      render(<ProductShowcase products={productsWithoutPrice} />);
      expect(screen.getByText("Price not found")).toBeInTheDocument();
    });

    it("displays the provided price", () => {
      render(<ProductShowcase products={mockProducts} />);
      expect(screen.getByText("$99.99")).toBeInTheDocument();
    });
  });

  describe("Rating display", () => {
    it("renders rating with star icon when rating is provided", () => {
      const { container } = render(<ProductShowcase products={mockProducts} />);
      const ratings = container.querySelectorAll(".text-amber-500");
      expect(ratings.length).toBeGreaterThan(0);
    });

    it("does not render rating when rating is not provided", () => {
      const productsWithoutRating: Product[] = [
        {
          title: "Product",
          price: "$10",
          link: "https://example.com",
        },
      ];
      const { container } = render(<ProductShowcase products={productsWithoutRating} />);
      const ratingText = screen.queryByText(/^\d+(\.\d+)?$/);
      expect(ratingText).not.toBeInTheDocument();
    });
  });

  describe("Source display", () => {
    it("renders source with external link icon when source is provided", () => {
      render(<ProductShowcase products={mockProducts} />);
      expect(screen.getByText("Amazon")).toBeInTheDocument();
      expect(screen.getByText("Best Buy")).toBeInTheDocument();
    });

    it("does not render source section when source is not provided", () => {
      const productsWithoutSource: Product[] = [
        {
          title: "Product",
          price: "$10",
          link: "https://example.com",
        },
      ];
      render(<ProductShowcase products={productsWithoutSource} />);
      const { container } = render(<ProductShowcase products={productsWithoutSource} />);
      // Check that no source text is in the first product card
      const cards = container.querySelectorAll("a");
      expect(cards[0].textContent).not.toContain("Amazon");
    });
  });

  describe("Grid layout", () => {
    it("uses grid layout for products", () => {
      const { container } = render(<ProductShowcase products={mockProducts} />);
      const grid = container.querySelector(".grid");
      expect(grid).toBeInTheDocument();
      expect(grid).toHaveClass("grid-cols-1", "sm:grid-cols-2", "lg:grid-cols-3");
    });

    it("renders correct number of product cards", () => {
      const { container } = render(<ProductShowcase products={mockProducts} />);
      const cards = container.querySelectorAll("a");
      expect(cards.length).toBe(mockProducts.length);
    });
  });

  describe("Edge cases", () => {
    it("handles products with all optional fields", () => {
      const fullProduct: Product[] = [
        {
          title: "Complete Product",
          price: "$199.99",
          image: "https://example.com/image.jpg",
          rating: 5.0,
          link: "https://example.com/product",
          source: "Store",
        },
      ];
      render(<ProductShowcase products={fullProduct} />);
      expect(screen.getByText("Complete Product")).toBeInTheDocument();
      expect(screen.getByText("$199.99")).toBeInTheDocument();
      expect(screen.getByText("5")).toBeInTheDocument();
      expect(screen.getByText("Store")).toBeInTheDocument();
    });

    it("handles products with only required fields", () => {
      const minimalProduct: Product[] = [
        {
          title: "Minimal Product",
          link: "https://example.com/product",
        },
      ];
      render(<ProductShowcase products={minimalProduct} />);
      expect(screen.getByText("Minimal Product")).toBeInTheDocument();
      expect(screen.getByText("Price not found")).toBeInTheDocument();
    });

    it("handles long product titles", () => {
      const longTitleProduct: Product[] = [
        {
          title:
            "This is a very long product title that should be truncated or wrapped properly in the UI to avoid layout issues",
          link: "https://example.com/product",
        },
      ];
      render(<ProductShowcase products={longTitleProduct} />);
      expect(
        screen.getByText(/This is a very long product title/)
      ).toBeInTheDocument();
    });

    it("handles special characters in product data", () => {
      const specialProduct: Product[] = [
        {
          title: 'Product with "quotes" & ampersand',
          price: "$19.99",
          link: "https://example.com/product?id=123&category=test",
          source: "Store & Co.",
        },
      ];
      render(<ProductShowcase products={specialProduct} />);
      expect(screen.getByText('Product with "quotes" & ampersand')).toBeInTheDocument();
      expect(screen.getByText("Store & Co.")).toBeInTheDocument();
    });
  });
});