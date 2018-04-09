Rails.application.routes.draw do
  
  resources :amenities
  
  resources :listings do 
    resources :bookings
    resources :amenities
  end
  resources :bookings
  
  resources :user do 
    resources :bookings, only: [:index, :show, :edit]
  end
  

  devise_for :users
  root to: 'pages#home'
  # For details on the DSL available within this file, see http://guides.rubyonrails.org/routing.html
end
