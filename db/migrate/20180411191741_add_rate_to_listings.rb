class AddRateToListings < ActiveRecord::Migration[5.1]
  def change
    add_monetize :listings, :rate, currency: { present: false }
  end
end
