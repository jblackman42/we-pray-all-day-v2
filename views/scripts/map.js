class WPADMap extends HTMLElement {
  constructor() {
    super();

    this.apiKey = this.getAttribute('googleMapsAPIKey');
    this.mapDiv = null; // add a property to hold the map div
    this.geocoder = null;
    this.communities = [];
    this.markers = [];
    this.bounds = null;
    this.infowindow = null;
  }

  getContacts = async () => {
    return await axios({
      method: 'get',
      url: '/api/v2/mp/contacts'
    })
      .then(response => response.data)
  }

  getCommunities = async () => {
    return await axios({
      method: 'get',
      url: '/api/v2/mp/getCommunities'
    })
      .then(response => response.data)
  }

  initMap = async () => {
    this.communities = await this.getCommunities();
    this.geocoder = new google.maps.Geocoder();
    this.bounds = new google.maps.LatLngBounds();
    this.infowindow = new google.maps.InfoWindow();
    
    // The location of Arizona
    var arizona = {lat: 34.048928, lng: -111.093731};
  
    // The map, centered at Arizona, with custom styles applied
    this.map = new google.maps.Map(this.mapDiv, {
      zoom: 7,
      center: arizona,
      disableDefaultUI: true,
      styles: [
        {
          featureType: 'all',
          elementType: 'all',
          stylers: [
            { visibility: 'off' }
          ]
        },
        {
          featureType: 'administrative',
          elementType: 'geometry.stroke',
          stylers: [
            { visibility: 'on' },  // Make sure administrative lines are visible
            { color: '#111111' }  // White color for contrast
          ]
        },
        {
          featureType: 'landscape',
          elementType: 'geometry',
          stylers: [
            { visibility: 'on' },
            { color: '#333333' }  // Dark background
          ]
        },
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [
            { visibility: 'off' }
          ]
        },
        {
          featureType: 'transit',
          elementType: 'labels',
          stylers: [
            { visibility: 'on' },
            { color: '#ffffff' }
          ]
        },
        {
          featureType: 'water',
          elementType: 'geometry',
          stylers: [
            { visibility: 'on' },
            { color: '#2980b9' }  // You can modify this color to fit your needs
          ]
        }
      ]
    });
    
    
  
    this.communities.forEach(community => {
      const communityAddress = `${community.Address}, ${community.City}, ${community.State} ${community.Zip}`
      this.plotPointFromAddress(communityAddress, community.Community_Name)
    })
    
    // this.contacts.forEach((contact, i) => {
    //   console.log(`${i + 1} / ${this.contacts.length}`)
    //   const {'State/Region': State, Postal_Code, Address_Line_1, City, Household_Name} = contact
    //   const householdAddress = `${Address_Line_1}, ${City}, ${State} ${Postal_Code}`
    //   this.plotPointFromAddress(householdAddress, Household_Name)
    // })
  }
   

  plotPointFromAddress = (address, title) => {
    this.geocoder.geocode({'address': address}, (results, status) => {
      if (status === 'OK') {
        const marker = new google.maps.Marker({
          map: this.map,
          position: results[0].geometry.location,
          title: title,
          icon: {
            url: '/assets/circle-regular.svg',
            scaledSize: new google.maps.Size(30,30)
          }
        });

        marker.addListener("click", () => {
          this.infowindow.setContent(`
            <div>
              <h2 style="margin: 0;">${title}</h2>
              <p style="margin: .5rem 0 0 0;">${address}</p>
            </div>
          `)
          this.infowindow.open({
            anchor: marker,
            map,
          });
        });
        this.markers.push(marker)
        
        // Extend the bounds to include the new marker's location
        this.bounds.extend(marker.position);
        
        // After plotting all points, fit the map to the bounds
        if(this.markers.length === this.communities.length) {
          this.map.fitBounds(this.bounds);
        }
      } else {
        console.error('Geocode was not successful for the following reason: ' + status);
      }
    });
  }

  connectedCallback() {
    // Create a div element for the map and append it to the custom element
    this.mapDiv = document.createElement('div');
    this.mapDiv.id = 'map';
    this.appendChild(this.mapDiv);

    this.loadScript();
  }

  loadScript = () => {
    window.initMap = this.initMap; // Assign the class method to window so it can be used as the callback
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${this.apiKey}&callback=initMap`;
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
  }
}

customElements.define('wpad-map', WPADMap);
