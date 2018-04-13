class AddPaymentToBookings < ActiveRecord::Migration[5.1]
  def change
    add_column :bookings, :state, :string
    add_monetize :bookings, :amount
    add_column :bookings, :payment, :jsonb
  end
end
