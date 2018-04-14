class ListingsController < ApplicationController
  
  def index
    @listings = policy_scope(current_user.listings).order(created_at: :desc)
    
    @geo_listings = current_user.listings.where.not(latitude: nil, longitude: nil)

    @markers = @geo_listings.map do |listing|
      {
        lat: listing.latitude,
        lng: listing.longitude#,
        #infoWindow: { content: render_to_string(partial: "/listing/map_box", locals: { listing: listing }) }
      }
    end
  end

  def show
    @listing = Listing.find(params[:id])
    authorize @listing
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
    params.require(:listing).permit(:name, :rate)
  end
end
