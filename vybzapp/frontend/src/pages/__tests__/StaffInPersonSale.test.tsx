import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import StaffInPersonSale from '../StaffInPersonSale';

global.fetch = jest.fn();

function renderPage() {
  return render(
    <BrowserRouter>
      <StaffInPersonSale />
    </BrowserRouter>
  );
}

describe('StaffInPersonSale', () => {
  beforeEach(() => {
    (global.fetch as jest.Mock).mockReset();
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) =>
      key === 'authToken' ? 'staff-token' : null
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('completes a cash sale and shows the invoice action', async () => {
    (global.fetch as jest.Mock).mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/api/products/')) {
        return {
          ok: true,
          json: async () => ({
            results: [{ uuid: 'prod-1', title: 'Desk mat', price: 24, stock: 3, images: [] }],
          }),
        };
      }
      if (url.includes('/api/staff/in-person-sale/') && init?.method === 'POST') {
        const body = JSON.parse(String(init.body));
        expect(body.payment_method).toBe('cash');
        expect(body.customer_name).toBe('Maya Buyer');
        expect(body.customer_email).toBe('maya@example.com');
        expect(body.items).toEqual([{ uuid: 'prod-1', quantity: 1 }]);
        return {
          ok: true,
          json: async () => ({
            success: true,
            invoice_url: '/api/staff/in-person-sale/9/invoice/',
            invoice_emailed: true,
            order: {
              id: 9,
              status: 'DELIVERED',
              payment_method: 'cash',
              contact_email: 'maya@example.com',
              grand_total: 24,
              shipping_address: { full_name: 'Maya Buyer' },
              orderitem_set: [{ product: { title: 'Desk mat' }, quantity: 1 }],
            },
          }),
        };
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Desk mat')).toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: /Back to Store/i })).toHaveAttribute('href', '/product/');
    expect(screen.getByText(/Add a product to start this sale/i)).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Cash/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Credit card/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
        fireEvent.change(screen.getByLabelText(/Customer name/i), { target: { value: 'Maya Buyer' } });
    fireEvent.change(screen.getByLabelText(/Customer email/i), { target: { value: 'maya@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /Complete cash sale/i }));

    await waitFor(() => {
      expect(screen.getByText(/Sale complete — order #9/i)).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /Download invoice/i })).toBeInTheDocument();
    expect(screen.getByText('maya@example.com')).toBeInTheDocument();
  });
});
