class CreateListingAmenities < ActiveRecord::Migration[5.1]
  def change
    create_table :listing_amenities do |t|
      t.belongs_to :listing, foreign_key: true
      t.belongs_to :booking, foreign_key: true

      t.timestamps
    end
  end
end
