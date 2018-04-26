class ListingsController < ApplicationController
  skip_before_action :authenticate_user!, only: [:index, :show]


  def index
    if params[:query].present?
      @listings = policy_scope(Listing.where.not(latitude: nil, longitude: nil, visible: false)).order(created_at: :desc)
    else
      @listings = policy_scope(Listing.where.not(latitude: nil, longitude: nil)).order(created_at: :desc)
      
      @markers = @listings.map do |listing|
        {
          lat: listing.latitude,
          lng: listing.longitude#,
          #infoWindow: { content: render_to_string(partial: "/listing/map_box", locals: { listing: listing }) }
        }
      end
    end
    
  end

  def show
    @listing = Listing.find(params[:id])
    authorize @listing
    @review = Review.new
  end

  def new
    @listing = Listing.new
    authorize @listing
  end
  
  def create
    @listing = Listing.new(listing_params)
    authorize @listing
    @listing.user = current_user
    if @listing.save
      redirect_to listing_path(@listing)
    else
      render :new
    end
  end

  def edit
    @listing = Listing.find(params[:id])
    authorize @listing
  end
  
  def update
    @listing = Listing.find(params[:id])
    authorize @listing
    @listing.update(listing_params)
    redirect_to listing_path(@listing)
  end

  def destroy
    @listing = Listing.find(params[:id])
    authorize @listing
    @listing.destroy
    redirect_to listing_path
  end
  
  private
  
  def listing_params
    params.require(:listing).permit(:name, :rate, :latitude, :longitude, :address, photos: [])
  end
end
