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
    {email: 'admin@gmail.com', password: 'Guigui21', admin: true, role: :admin  },
    {email: "owner@gmail.com",   password: "Guigui21", admin: false, role: :owner },
    {email: "tenant@gmail.com",  password: "Guigui21", admin: false, role: :tenant }
  ]
  amenity_seeds = [ 'Outdoor Pool', 'indoor Pool', 'Ball Room', 'Tenis Court', 'Stables']
  listing_seeds = [
    {
      name: 'Versailles',
      description: 'Palace france',
      address: "Place d'Armes, 78000 Versailles, France",
      rate_cents: 1500,
      photos: [
        'app/assets/images/room_1-1200x675.jpg',
        'app/assets/images/room_1-1200x675.jpg',
        'app/assets/images/room_1-1200x675.jpg'
      ]
    },
    {
      name: 'Buckinghma Palace',
      description: 'UK Palace',
      address: "buckingham palace, United Kingdom",
      rate_cents: 5000,
      photos: [
        'app/assets/images/room_1-1200x675.jpg',
        'app/assets/images/room_1-1200x675.jpg',
        'app/assets/images/room_1-1200x675.jpg'
      ]
    },
    {
      name: 'Presidential Palace',
      description: 'Palace in Portugal',
      address: "Rua da sociedade Farmaceutica 5, Lisboa Portugal",
      rate_cents: 1800,
      photos: [
        'app/assets/images/room_1-1200x675.jpg',
        'app/assets/images/room_1-1200x675.jpg',
        'app/assets/images/room_1-1200x675.jpg'
      ]
    },
    {
      name: 'Palace Pena',
      description: 'Palácio Nacional de Sintra. Vista para o Palácio Nacional de Sintra. Situado no centro histórico da Vila, foi habitado durante oito séculos pela Família Real Portuguesa. Era muito utilizado, sobretudo durante a Idade Média, para apoio durante os períodos de caça ou durante os meses de verão, devido ao clima ameno da...',
      address: "Pena Palace, Portugal",
      rate_cents: 1400,
      photos: [
        'app/assets/images/room_1-1200x675.jpg',
        'app/assets/images/room_1-1200x675.jpg',
        'app/assets/images/room_1-1200x675.jpg'
      ]
    },
    {
      name: 'Palace of Queluz',
      description: 'Royal residence of two generations of monarchs, only fifteen minutes away from Lisbon, the National Palace of Queluz is intimately linked with significant figures in Portuguese history. Today it constitutes a major heritage site in Portuguese architecture and landscaping, and contains an important collection which reflects ...',
      address: "Palace of Queluz, Portugal",
      rate_cents: 1200,
      photos: [
        'app/assets/images/room_1-1200x675.jpg',
        'app/assets/images/room_1-1200x675.jpg',
        'app/assets/images/room_1-1200x675.jpg'
      ]
    },
    {
      name: 'Monserrate Palace',
      description: 'Royal residence of two generations of monarchs, only fifteen minutes away from Lisbon, the National Palace of Queluz is intimately linked with significant figures in Portuguese history. Today it constitutes a major heritage site in Portuguese architecture and landscaping, and contains an important collection which reflects ...',
      address: "Monserrate Palace, Portugal",
      rate_cents: 16200,
      photos: [
        'app/assets/images/room_1-1200x675.jpg',
        'app/assets/images/room_1-1200x675.jpg',
        'app/assets/images/room_1-1200x675.jpg'
      ]
    },
    {
      name: 'Quirinal Palace',
      description: 'The Quirinal Palace is a historic building in Rome, Italy, one of the three current official residences of the President of the Italian Republic, together with Villa Rosebery in Naples and Tenuta di Castelporziano in Rome.',
      address: "Piazza del Quirinale, 00187 Roma RM, Italy",
      rate_cents: 1000,
      photos: [
        'app/assets/images/room_1-1200x675.jpg',
        'app/assets/images/room_1-1200x675.jpg',
        'app/assets/images/room_1-1200x675.jpg'
      ]
    },
    {
      name: 'Windsor Castle',
      description: 'Windsor Castle is a royal residence at Windsor in the English county of Berkshire. It is notable for its long association with the English and later British royal family and for its architecture.',
      address: "Monserrate Palace, Portugal",
      rate_cents: 1200,
      photos: [
        'app/assets/images/room_1-1200x675.jpg',
        'app/assets/images/room_1-1200x675.jpg',
        'app/assets/images/room_1-1200x675.jpg'
      ]
    },
  ]
  
  Booking.delete_all
  Review.delete_all
  # Delete all cloudinary photos to avoid mess
  Listing.all.each do |listing|
    listing.photos.each do |photo|
      Cloudinary::Api.delete_resources(photo.public_id)
    end
  end
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
    listing.address = seed[:address]
    listing.rate = seed[:rate]
    listing.user = User.first
    seed[:photos].each do |p| 
      listing.send(:photo_urls=, ["#{Rails.root+p}"] , folder: Rails.env.to_s, use_filename: true, image_metadata: true)
    end
    listing.save!
  end
  puts "Seeding complete!"
else
  puts "No changes were made!"
end
