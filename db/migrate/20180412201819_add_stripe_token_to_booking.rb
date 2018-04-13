class AddStripeTokenToBooking < ActiveRecord::Migration[5.1]
  def change
    add_column :bookings, :stripe_token, :string
  end
end
