# This file should contain all the record creation needed to seed the database with its default values.
# The data can then be loaded with the rails db:seed command (or created alongside the database with db:setup).
#
# Examples:
#
#   movies = Movie.create([{ name: 'Star Wars' }, { name: 'Lord of the Rings' }])
#   Character.create(name: 'Luke', movie: movies.first)
require 'date'
puts "ATENTION!!!! This seeding will delete all content and rebuild."
puts "Continue? (type yes/no)"
reply = STDIN.gets.chomp
if(reply.strip.downcase == 'yes') 

  user_seeds = [
    {email: "owner@gmail.com",  password: "Guigui21" },
    {email: "tenant@gmail.com", password: "Guigui21" }
  ]
  amenity_seeds = [ 'Outdoor Pool', 'indoor Pool', 'Ball Room', 'Tenis Court', 'Stables']
  listing_seeds = [
    {
      name: 'Versailles',
      description: 'Palace france',
      photos: [
        'http://en.chateauversailles.fr/sites/default/files/styles/push_image/public/visuels_principaux/cour-de-marbre-vignette-youtube_0.jpg?itok=zPP_fomi',
        'http://www.icon-icon.com/sites/default/files/styles/image_detail/public/field/image/bloggif_592712ccebcad.jpeg?itok=Jeh6bysb'
      ]
    },
    {
      name: 'Buckinghma Palace',
      description: 'UK Palace',
      photos: [
        'https://www.royalcollection.org.uk/sites/default/files/styles/rctr-scale-crop-350-350/public/vimeo-square.jpg?itok=Za2nJpHz',
        'https://www.royalcollection.org.uk/sites/default/files/styles/rctr-scale-1010w/public/residence_teasers/bp-708.jpg?itok=U2HhJB3X'
      ]
    }
  ]
  
  Booking.delete_all
  ##Delete all cloudinary photos to avoid mess
  # Estate.all.each do |estate|
  #   estate.photos.each do |photo|
  #     Cloudinary::Api.delete_resources(photo.public_id)
  #   end
  # end
  Listing.delete_all
  User.delete_all
  
  puts "Creating users"
  user_seeds.each do |seed|
    User.create(
      email: seed[:email],
      password: seed[:password]
    )
  end
  
  puts "Creating Listings"
  listing_seeds.each do |seed|
    listing = Listing.new
    listing.name = seed[:name]
    listing.user = User.first
    listing.save!
    #new_estate.photo_urls = estate[:photos]
  end
else
  puts "No changes were made!"
end
