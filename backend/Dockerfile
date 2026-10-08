# Use the official Python slim image as the base image for the backend
FROM python:3.11-slim

# Set the working directory inside the container
WORKDIR /app

# Install necessary system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy the requirements file on its own first, so the installed dependencies stay cached until it changes
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# The admin dashboard's map: DB-IP's free country database (IP Geolocation by DB-IP, CC BY 4.0), fetched again whenever
# the code changes, so every deploy has a recent copy. If db-ip.com can't be reached the build carries on, and countries
# are not recorded until the next build. Kept outside /app, so the development mount of the code doesn't hide it.
RUN mkdir -p /opt/dbip && \
    ( curl -fsSL "https://download.db-ip.com/free/dbip-country-lite-$(date +%Y-%m).mmdb.gz" \
      || curl -fsSL "https://download.db-ip.com/free/dbip-country-lite-$(date -d '1 month ago' +%Y-%m).mmdb.gz" ) \
    | gunzip > /opt/dbip/country.mmdb \
    || { rm -f /opt/dbip/country.mmdb; echo "Country database not downloaded: no countries until the next build"; }

# Expose the port the application will run on
EXPOSE 8000

# Apply any pending database migrations, then start the API
CMD ["sh", "-c", "alembic upgrade head && uvicorn main:app --host 0.0.0.0 --port 8000"]