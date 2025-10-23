-- Standardize location data to "City, State" format
-- This script normalizes all existing location entries to use consistent formatting

BEGIN;

-- Update Chicago variations to standard "Chicago, IL"
UPDATE users
SET location = 'Chicago, IL'
WHERE location IN ('Chicago', 'Chicago IL', 'Chicago IL ', 'Chicago, IL');

-- Update Los Angeles variations to standard "Los Angeles, CA"
UPDATE users
SET location = 'Los Angeles, CA'
WHERE location IN ('Los Angeles', 'Los Angeles California', 'Los Angeles California ', 'Los Angeles CA', 'Los Angeles, CA');

-- Update New York variations to standard "New York, NY"
UPDATE users
SET location = 'New York, NY'
WHERE location IN ('New York', 'New York NY', 'New York NY ', 'New York, NY');

-- Update Miami variations to standard "Miami, FL"
UPDATE users
SET location = 'Miami, FL'
WHERE location IN ('Miami', 'Miami FL', 'Miami Florida', 'Miami, FL');

-- Update Austin variations to standard "Austin, TX"
UPDATE users
SET location = 'Austin, TX'
WHERE location IN ('Austin', 'Austin TX', 'Austin Texas', 'Austin, TX');

-- Update San Francisco variations to standard "San Francisco, CA"
UPDATE users
SET location = 'San Francisco, CA'
WHERE location IN ('San Francisco', 'San Francisco CA', 'San Francisco California', 'San Francisco, CA');

-- Update Houston variations to standard "Houston, TX"
UPDATE users
SET location = 'Houston, TX'
WHERE location IN ('Houston', 'Houston TX', 'Houston Texas', 'Houston, TX');

-- Update Phoenix variations to standard "Phoenix, AZ"
UPDATE users
SET location = 'Phoenix, AZ'
WHERE location IN ('Phoenix', 'Phoenix AZ', 'Phoenix Arizona', 'Phoenix, AZ');

-- Update Philadelphia variations to standard "Philadelphia, PA"
UPDATE users
SET location = 'Philadelphia, PA'
WHERE location IN ('Philadelphia', 'Philadelphia PA', 'Philadelphia Pennsylvania', 'Philadelphia, PA');

-- Update San Diego variations to standard "San Diego, CA"
UPDATE users
SET location = 'San Diego, CA'
WHERE location IN ('San Diego', 'San Diego CA', 'San Diego California', 'San Diego, CA');

-- Update Dallas variations to standard "Dallas, TX"
UPDATE users
SET location = 'Dallas, TX'
WHERE location IN ('Dallas', 'Dallas TX', 'Dallas Texas', 'Dallas, TX');

-- Update San Jose variations to standard "San Jose, CA"
UPDATE users
SET location = 'San Jose, CA'
WHERE location IN ('San Jose', 'San Jose CA', 'San Jose California', 'San Jose, CA');

-- Update Seattle variations to standard "Seattle, WA"
UPDATE users
SET location = 'Seattle, WA'
WHERE location IN ('Seattle', 'Seattle WA', 'Seattle Washington', 'Seattle, WA');

-- Update Denver variations to standard "Denver, CO"
UPDATE users
SET location = 'Denver, CO'
WHERE location IN ('Denver', 'Denver CO', 'Denver Colorado', 'Denver, CO');

-- Update Boston variations to standard "Boston, MA"
UPDATE users
SET location = 'Boston, MA'
WHERE location IN ('Boston', 'Boston MA', 'Boston Massachusetts', 'Boston, MA');

-- Update Atlanta variations to standard "Atlanta, GA"
UPDATE users
SET location = 'Atlanta, GA'
WHERE location IN ('Atlanta', 'Atlanta GA', 'Atlanta Georgia', 'Atlanta, GA');

-- Update Portland variations to standard "Portland, OR"
UPDATE users
SET location = 'Portland, OR'
WHERE location IN ('Portland', 'Portland OR', 'Portland Oregon', 'Portland, OR');

-- Update Las Vegas variations to standard "Las Vegas, NV"
UPDATE users
SET location = 'Las Vegas, NV'
WHERE location IN ('Las Vegas', 'Las Vegas NV', 'Las Vegas Nevada', 'Las Vegas, NV');

-- Update Nashville variations to standard "Nashville, TN"
UPDATE users
SET location = 'Nashville, TN'
WHERE location IN ('Nashville', 'Nashville TN', 'Nashville Tennessee', 'Nashville, TN');

-- Update Detroit variations to standard "Detroit, MI"
UPDATE users
SET location = 'Detroit, MI'
WHERE location IN ('Detroit', 'Detroit MI', 'Detroit Michigan', 'Detroit, MI');

-- Update Minneapolis variations to standard "Minneapolis, MN"
UPDATE users
SET location = 'Minneapolis, MN'
WHERE location IN ('Minneapolis', 'Minneapolis MN', 'Minneapolis Minnesota', 'Minneapolis, MN');

-- Show summary of standardized locations
SELECT
  location,
  COUNT(*) as user_count
FROM users
WHERE location IS NOT NULL
GROUP BY location
ORDER BY location;

COMMIT;

SELECT 'Location data has been standardized to "City, State" format.' AS message;
