document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const activityViews = new Map();

  function createParticipantRow(name, email, details, availability) {
    const participant = document.createElement("li");
    const participantEmail = document.createElement("span");
    participantEmail.textContent = email;

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "participant-remove";
    removeButton.setAttribute("aria-label", `Unregister ${email} from ${name}`);
    removeButton.title = "Unregister participant";
    removeButton.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M4 7h16M10 11v6m4-6v6M5 7l1 13h12l1-13M9 7V4h6v3" />
      </svg>
    `;

    removeButton.addEventListener("click", async () => {
      removeButton.disabled = true;
      try {
        const response = await fetch(
          `/activities/${encodeURIComponent(name)}/participants/${encodeURIComponent(email)}`,
          { method: "DELETE" }
        );
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.detail || "Could not unregister participant");
        }

        const participantIndex = details.participants.indexOf(email);
        if (participantIndex !== -1) {
          details.participants.splice(participantIndex, 1);
        }
        participant.remove();
        availability.innerHTML = `<strong>Availability:</strong> ${details.max_participants - details.participants.length} spots left`;
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        messageDiv.classList.remove("hidden");
      } catch (error) {
        messageDiv.textContent = error.message || "Failed to unregister participant. Please try again.";
        messageDiv.className = "error";
        messageDiv.classList.remove("hidden");
        console.error("Error unregistering participant:", error);
      } finally {
        if (participant.isConnected) {
          removeButton.disabled = false;
        }
      }
    });

    participant.append(participantEmail, removeButton);
    return participant;
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p class="activity-availability"><strong>Availability:</strong> ${spotsLeft} spots left</p>
        `;
        const availability = activityCard.querySelector(".activity-availability");

        const participantsHeading = document.createElement("h5");
        participantsHeading.className = "participant-heading";
        participantsHeading.textContent = "Participants";

        const participantsList = document.createElement("ul");
        participantsList.className = "participant-list";
        details.participants.forEach((email) => {
          participantsList.appendChild(createParticipantRow(name, email, details, availability));
        });

        activityCard.append(participantsHeading, participantsList);
        activityViews.set(name, { details, participantsList, availability });

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        const activityView = activityViews.get(activity);
        if (activityView && !activityView.details.participants.includes(email)) {
          activityView.details.participants.push(email);
          activityView.participantsList.appendChild(
            createParticipantRow(activity, email, activityView.details, activityView.availability)
          );
          activityView.availability.innerHTML = `<strong>Availability:</strong> ${activityView.details.max_participants - activityView.details.participants.length} spots left`;
        }

        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
