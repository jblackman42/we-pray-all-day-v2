class Calendar extends HTMLElement {
    constructor() {
        super();
        this.apiURL = 'http://localhost:3000'
        // this.apiURL = 'https://weprayallday.com'


        var link = document.createElement( "link" );
        link.href = this.apiURL + '/styles-widgets/calendar.css';
        link.type = "text/css";
        link.rel = "stylesheet";
        link.media = "screen,print";
        document.getElementsByTagName( "head" )[0].appendChild( link );
        
        var icons = document.createElement( "link" );
        icons.href = 'https://fonts.googleapis.com/icon?family=Material+Icons';
        icons.type = "text/css";
        icons.rel = "stylesheet";
        icons.media = "screen,print";
        document.getElementsByTagName( "head" )[0].appendChild( icons );

        this.monthDays = [];
        this.communityFilter = [];
        this.allCommunities = [];
        
        const today = new Date(new Date().toLocaleString('en-US', {timeZone: 'US/Arizona'}));
        this.month = today.getMonth();
        this.year = today.getFullYear();

        this.draw();
    }
    loading = () => {
        const loadingDOM = document.querySelector('#loading');
        loadingDOM.style.visibility = 'visible';
        loadingDOM.style.display = 'grid';
    }
    
    doneLoading = () => {
        const loadingDOM = document.querySelector('#loading');
        loadingDOM.style.visibility = 'hidden';
        loadingDOM.style.display = 'none';
    }

    nextMonth = () => {
        this.monthDays = [];
        if (this.month < 11) {
            this.month ++;
        } else {
            this.month = 0;
            this.year ++;
        }
        this.update(this.year, this.month)
    }
    prevMonth = () => {
        this.monthDays = [];
        if (this.month > 0) {
            this.month --;
        } else {
            this.month = 11;
            this.year --;
        }
        this.update(this.year, this.month)
    }
    
    formatDate = (dateString) => {
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Months are 0-based in JavaScript
        const day = date.getDate().toString().padStart(2, '0');
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const seconds = date.getSeconds().toString().padStart(2, '0');

        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
    }

    draw = async () => {
        this.innerHTML = `
            <div id="loading">
                <div class="loader"></div>
            </div>
            <div class="calendar">
                <div class="calendar-controls">
                <div class="month-selector-container">
                    <button class="btn" id="prev-month"><i class="material-icons">keyboard_arrow_left</i></button>
                    <h3 id="month-label">September 2023</h3>
                    <button class="btn" id="next-month"><i class="material-icons">keyboard_arrow_right</i></button>
                </div>

                <select id="community-select"></select>

                <div id="legend">
                    <div id="empty-square"></div>
                    <p>: Open for Prayer</p>
                    <div id="filled-square"></div>
                    <p>: Booked for Prayer</p>
                </div>
                </div>

                <div id="weekdays">
                </div>

                <div id="days-grid">
                </div>
            </div>
        `
        const prevMonthBtn = document.getElementById('prev-month');
        const nextMonthBtn = document.getElementById('next-month');
        prevMonthBtn.onclick = this.prevMonth;
        nextMonthBtn.onclick = this.nextMonth;

        const communitySelectDOM = document.getElementById('community-select');
        communitySelectDOM.onchange = () => this.update(this.year, this.month);
        
        // Populate Communities Selection --------------------------------------------------

        // this.allCommunities = await axios({
        // method: 'get',
        // url: `${this.apiURL}/api/v2/mp/getCommunities`
        // })
        // .then(response => response.data)
        // .catch(err => {
        //     console.error(err);
        // })

        this.allCommunities = await fetch(`${this.apiURL}/api/v2/mp/getCommunities`)
            .then(response => response.json())
            .catch(err => {
                console.error(err)
                this.doneLoading();
            });

        this.allCommunities.sort((a,b) => a.Community_Name < b.Community_Name ? -1 : b.Community_Name < a.Community_Name ? 1 : 0);
        this.allCommunities.unshift({
            WPAD_Community_ID: 0,
            Community_Name: "All Churches & Communities..."
        })
        communitySelectDOM.innerHTML = this.allCommunities.map(community => {
            const { WPAD_Community_ID, Community_Name } = community;
            return `
                <option value="${WPAD_Community_ID}">${Community_Name}</option>
            `
        }).join('')

        return this.update(this.year, this.month);
    }

    getNumLabel = (date) => {
        const dateArray = date.toString().split('')
        const lastDateDigit = dateArray[dateArray.length - 1];
        return [11,12,13].includes(date) ? 'th' : lastDateDigit == 1 ? 'st' : lastDateDigit == 2 ? 'nd' : lastDateDigit == 3 ? 'rd' : 'th'
    }

    update = async (year, month) => {
        this.loading();
        // Handle Community Filter ------------------------------------------------------
        
        
        
        // ------------------------------------------------------------------------------

        // Create Month Data ------------------------------------------------------------

        const startDateString = this.formatDate(new Date(new Date(year, month, 1).getTime() - ((1000*60*60*24) * (new Date(year, month, 1).getDay() + 1))));
        const endDateString = this.formatDate(new Date(new Date(year, month + 1, 1).getTime()))
        const allPrayerSchedules = await fetch(`${this.apiURL}/api/v2/mp/getSchedules?startDate=${startDateString}&endDate=${endDateString}`)
            .then(response => response.json())
            .catch(err => {
                console.error(err)
                this.doneLoading();
            });
        const allCommunityReservations = await fetch(`${this.apiURL}/api/v2/mp/getReservations?startDate=${startDateString}&endDate=${endDateString}`)
            .then(response => response.json())
            .catch(err => {
                console.error(err)
                this.doneLoading();
            });
        // const allPrayerSchedules = await axios({
        //   method: 'get',
        //   url: `${this.apiURL}/api/v2/mp/getSchedules`,
        //   params: {
        //     startDate: startDateString,
        //     endDate: endDateString
        //   }
        // })
        //   .then(response => response.data)

        // const allCommunityReservations = await axios({
        //   method: 'get',
        //   url: `${this.apiURL}/api/v2/mp/getReservations`,
        //   params: {
        //     startDate: startDateString,
        //     endDate: endDateString
        //   }
        // })
        //   .then(response => response.data)

        // const dateObjEx = {
        //   date: new Date().toDateString(),
        //   scheduledHours: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23],
        //   Champion: 'Pure Heart Church',
        //   RankedSignUps: [],
        // }

        this.monthDays = [];
        const date = new Date(new Date(year, month, 1).getTime() - ((1000*60*60*24) * new Date(year, month, 1).getDay()))
        //loops and iterates day by one until month no longer is the same
        while (date.getMonth()%11 <= month && date.getFullYear() <= year) {
            const communitySignUps = allPrayerSchedules.filter(schedule => new Date(schedule.Start_Date).toDateString() == new Date(date).toDateString() && schedule.Community_Name).map(schedule => schedule.Community_Name);
            const currChampions = allCommunityReservations.filter(reservation => new Date(reservation.Reservation_Date).toDateString() == new Date(date).toDateString())
            const scheduledHours = allPrayerSchedules.filter(schedule => new Date(schedule.Start_Date).toDateString() == new Date(date).toDateString()).map(schedule => new Date(new Date(schedule.Start_Date).getTime() - ((new Date(schedule.Start_Date).getTimezoneOffset() - 420) * 60000)).getHours())
            const sortedCommunityNamesByCount = Object.entries(communitySignUps.reduce((acc, v) => (acc[v] = (acc[v] || 0) + 1, acc), {})).sort((a, b) => b[1] - a[1]);
            const rankedChampion = communitySignUps.length ? sortedCommunityNamesByCount[0][0] : '';
            const rankedCommunity = this.allCommunities.find(community => community.Community_Name == rankedChampion)
            //saves each day of the month parameter
            this.monthDays.push({ 
            date: date.toDateString(),
            scheduledHours: scheduledHours,
            bookedChampions: currChampions,
            hoursCovered: [...new Set(scheduledHours)].length
            });

            date.setDate(date.getDate() + 1);
        }

        // ------------------------------------------------------------------------------
        
        // Create Header Row ------------------------------------------------------------
        
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const monthHeaderDOM = document.querySelector('#month-label');
        monthHeaderDOM.innerHTML = `${months[month]} ${year}`;

        // ------------------------------------------------------------------------------
            
        // Create Week Row ------------------------------------------------------------
        
        const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const weekdaysDOM = document.querySelector('#weekdays');
        weekdaysDOM.innerHTML = weekdays.map(weekday => {
            const otherLetters = weekday.split('').slice(1).join('');
            const firstLetter = weekday.split('')[0];
            return `<p>${firstLetter}<span>${otherLetters}</span></p>`
        }).join('')
        
        // ----------------------------------------------------------------------------

        // Create Calendar Days ------------------------------------------------------------

        const daysGrid = document.querySelector('#days-grid');
        const communitySelectDOM = document.getElementById('community-select');
        daysGrid.innerHTML = this.monthDays.map(data => {
        const today = new Date();
        today.setDate(today.getDate()-1);
        const currDate = new Date(data.date);
        const blocked = Date.parse(currDate) - Date.parse(today) <= 0;
        const date = currDate.getDate();
        const currMonth = currDate.getMonth() + 1;
        const currYear = currDate.getFullYear();
        const hours = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23];
        const hoursPrayedFor = 24 - data.hoursCovered;
        const percentCovered = Math.floor((hoursPrayedFor / 24) * 100);
        const currChampions = data.bookedChampions;
        const currChampionsIDs = currChampions ? currChampions.map(data => data.WPAD_Community_ID) : [];
        const currCommunityFilter = parseInt(communitySelectDOM.value); //community id
        
        return `
            <button ${!blocked ? `onclick="window.location='${this.apiURL}/signup?date=${data.date}'"` : ''} class="calendar-day ${!blocked ? 'pointer' : ''} ${currChampionsIDs.includes(currCommunityFilter) || currCommunityFilter == 0 ? '' : 'dull'}">
            <p class="date">${date}<sup>${this.getNumLabel(date)}</sup></p>
            
            <div class="day-row">
                ${currChampions.length ? `<p class="community">Championed By:<br><span class="community-name">${currChampionsIDs.includes(currCommunityFilter) ? currChampions[currChampionsIDs.indexOf(currCommunityFilter)].Community_Name : currChampions[0].Community_Name}</span></p>` : '<p class="community">No Champion Found</p>'}
                
            </div>
            <div class="day-row bottom">
                <p class="hours-label">${hoursPrayedFor > 0 ? new Date() > currDate ? `${data.hoursCovered} Hours Prayed For` : `${hoursPrayedFor} Hours Remaining` : 'Fully Covered!'}</p>
                <p class="percent-label">${percentCovered}%</p>
                <div class="hours-container">
                ${hours.map(hour => {
                    return `<${blocked ? 'p' : 'a'} href="${this.apiURL}/signup?date=${data.date}&hour=${hour}}" id="${hour}-${date}-${currMonth}-${currYear}" class="hour ${data.scheduledHours.includes(hour) ? 'booked' : ''}" data-content="${hour > 12 || hour == 0 ? Math.abs(hour - 12) : hour}:00 ${hour < 12 ? 'AM' : 'PM'}"></${blocked ? 'p' : 'a'}>`
                }).join('')}
                </div>
                <div class="progress-bar-container">
                    <div class="progress-bar" id="bar-${date}-${month}-${year}" style="max-width: ${percentCovered}%;"></bar>
                </div>
            </div>
            </button>
        `
        }).join('')

        // ---------------------------------------------------------------------------------
        
        // Populate Hours With Prayer Schedules --------------------------------------------

        // const startDateString = this.formatDate(this.monthDays[0].date);
        // const endDateString = this.formatDate(new Date(new Date(this.monthDays[this.monthDays.length - 1].date).getTime() + (86400000 - 1)))
        // const allPrayerSchedules = await axios({
        //   method: 'get',
        //   url: '/api/v2/mp/getSchedules',
        //   params: {
        //     startDate: startDateString,
        //     endDate: endDateString
        //   }
        // })
        //   .then(response => response.data)

        // console.log(this.monthDays)
        // for (const prayer of allPrayerSchedules) {
        //   const { Start_Date, Community_Name } = prayer;
        //   const currDate = new Date(new Date(Start_Date).getTime() - ((new Date(Start_Date).getTimezoneOffset() - 420) * 60000));
        //   const hour = currDate.getHours()
        //   const day = currDate.getDate()
        //   const month = currDate.getMonth() + 1;
        //   const year = currDate.getFullYear();

        //   const currHourDOM = document.getElementById(`${hour}-${day}-${month}-${year}`);
        //   if (!currHourDOM) continue;
        //   currHourDOM.classList.add('booked')
        // }

        // ---------------------------------------------------------------------------------

        this.doneLoading(); 
    }
}

customElements.define('prayer-calendar', Calendar);