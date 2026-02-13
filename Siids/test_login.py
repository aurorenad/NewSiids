import urllib.request
import urllib.error
import json
import uuid

BASE_URL = "http://localhost:2005"
TEST_USER = f"testuser_{uuid.uuid4().hex[:8]}"
TEST_PASS = "Test@123"

def test_register():
    print(f"Attempting register to {BASE_URL}/api/auth/register...")
    payload = {
        "username": TEST_USER,
        "password": TEST_PASS,
        "role": "User"
    }
    # Note: UserController has @PostMapping("/register") mapped to nothing?
    # Let's check UserController again.
    # It has @PostMapping("/register"). Route is /register.
    # It has NO class level mapping.
    # So it is /register.
    
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(f"{BASE_URL}/register", data=data, headers={'Content-Type': 'application/json'})
    
    try:
        with urllib.request.urlopen(req) as response:
            print(f"Register Status Code: {response.getcode()}")
            if response.getcode() == 200:
                print("Register Successful")
                return True
    except urllib.error.HTTPError as e:
        print(f"Register Failed: {e.code}")
        print(e.read().decode('utf-8'))
        return False
    except Exception as e:
        print(f"Register Error: {e}")
        return False

def test_login():
    print(f"Attempting login to {BASE_URL}/login...")
    payload = {
        "username": TEST_USER,
        "password": TEST_PASS
    }
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(f"{BASE_URL}/login", data=data, headers={'Content-Type': 'application/json'})

    try:
        with urllib.request.urlopen(req) as response:
            print(f"Login Status Code: {response.getcode()}")
            if response.getcode() == 200:
                response_body = response.read().decode('utf-8')
                data = json.loads(response_body)
                print("Login Successful")
                return data
    except urllib.error.HTTPError as e:
        print(f"Login Failed: {e.code}")
        print(e.read().decode('utf-8'))
        return None
    except Exception as e:
        print(f"Login Error: {e}")
        return None

def test_notifications(token, employee_id):
    print(f"\nAttempting to fetch notifications for {employee_id}...")
    headers = {
        "Authorization": f"Bearer {token}",
        "employee_id": employee_id
    }
    # Note: If I created a user via /register, it might not have an Employee record.
    # UserService.verify checks EmployeeRepo.
    # If Employee is missing, verify returns error?
    # UserController.login checks verify result.
    
    # Wait, UserController.register just saves User.
    # It does NOT create Employee.
    # So Login MIGHT fail if verify checks Employee.
    
    url = f"{BASE_URL}/api/notifications/employee/{employee_id}"
    req = urllib.request.Request(url, headers=headers)
    
    try:
        with urllib.request.urlopen(req) as response:
            print(f"Notifications Status Code: {response.getcode()}")
            print("Notifications fetch successful")
    except urllib.error.HTTPError as e:
        print(f"Notifications Fetch Failed: {e.code}")
        print(e.read().decode('utf-8'))
    except Exception as e:
        print(f"Notification Fetch Error: {e}")

if __name__ == "__main__":
    if test_register():
        # But wait, UserController.login fails if Employee not found in UserService.verify!
        # UserService.java:
        # Optional<Employee> employee = employeeRepo.findByEmployeeId(user.getUsername());
        # if (employee.isEmpty()) ... return "error": "Employee not found"
        
        # So I CANNOT login with a just-registered User if there is no Employee.
        # This explains why I need the default user "00763", who presumably exists in structures/data.
        pass

    # Re-try default user
    print("\n--- Retrying Default User ---")
    import urllib.request
    import json
    
    # Assuming 00763 exists as Employee.
    BASE_URL = "http://localhost:2005"
    USERNAME = "00763"
    PASSWORD = "Aurore!@123"
    
    payload = {
        "username": USERNAME,
        "password": PASSWORD
    }
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(f"{BASE_URL}/login", data=data, headers={'Content-Type': 'application/json'})
    
    try:
        with urllib.request.urlopen(req) as response:
            print(f"Login Status Code: {response.getcode()}")
            if response.getcode() == 200:
                response_body = response.read().decode('utf-8')
                data = json.loads(response_body)
                print("Login Successful")
                token = data.get("token")
                test_notifications(token, USERNAME)
    except urllib.error.HTTPError as e:
        print(f"Login Failed: {e.code}")
        print(e.read().decode('utf-8'))
