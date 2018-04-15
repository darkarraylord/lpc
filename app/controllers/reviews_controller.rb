class ReviewsController < ApplicationController
  def index
  end
  
  def show
  end

  def new
  end
  
  def create
    @listing = Listing.find(params[:listing_id])
    @review = Review.new(review_params)
    authorize @review
    @review.listing = @listing
    @review.user = current_user
    if @review.save
      respond_to do |format|
        format.html { redirect_to listing_path(@listing) }
        format.js  # <-- will render `app/views/reviews/create.js.erb`
      end
    else
      respond_to do |format|
        format.html { render 'listings/show' }
        format.js
      end
    end
  end

  private

  def review_params
    params.require(:review).permit(:content, :rating, :user, :listing)
  end
end
