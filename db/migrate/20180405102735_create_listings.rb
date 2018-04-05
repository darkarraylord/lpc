class CreateListings < ActiveRecord::Migration[5.1]
  def change
    create_table :listings do |t|
      t.string :name
      t.belongs_to :user, foreign_key: true, index: true

      t.timestamps
    end
  end
end
