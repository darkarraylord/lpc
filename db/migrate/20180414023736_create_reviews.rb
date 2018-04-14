class CreateReviews < ActiveRecord::Migration[5.1]
  def change
    create_table :reviews do |t|
      t.text :content
      t.belongs_to :user, foreign_key: true, index: true
      t.belongs_to :listing, foreign_key: true, index: true
      t.float :rating

      t.timestamps
    end
  end
end
