class AddVisibilityToListings < ActiveRecord::Migration[5.1]
  def change
    add_column :listings, :visible, :boolean,  null: false, default: true
  end
end
