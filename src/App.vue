<script setup>
import { ref, onMounted } from 'vue'

const awardsURL = `https://whu-icpc.github.io/WHU-ICPC/awards.json`
const awards = ref(null)

onMounted(async () => {
  const jsonData = await (await fetch(awardsURL)).json()
  jsonData.forEach(item => {
    item.collapsed = false;
  });
  awards.value = jsonData
})
</script>

<template>
  <div class="navbar">
    <ul>
      <li><p>WHU-ICPC</p></li>
      <li><a class="active" href="#">Home</a></li>
      <li><a href="#">Awards</a></li>
    </ul>
  </div>
  
  <div class="center-container">
    <ul class="awards" style="width: 100%;">
      <li v-for="season of awards">
        <div class="card1">
          <a href="#" @click="season.collapsed=!season.collapsed">{{ season.season }}</a>
        </div>
        <ul class="card2" v-if="!season.collapsed">
          <li v-for="contest of season.contests">
            <p>{{ contest.contest }}  {{ contest.date }}</p>
            <ul>
              <div v-for="team of contest.teams" class="card3">
                <p class="item1">{{ team.team }}</p>

                <div class="item2">
                <template v-for="(item, index) in team.members.split('、')">
                  <a v-if="index > 0">、</a>
                  <a href="#">{{ item }}</a>
                </template>
                </div>

                <p class="item3">{{ team.prize }}</p>
              </div>
            </ul>
          </li>
        </ul>
      </li>
    </ul>
  </div>
</template>

<style scoped>

* {
  font-size: 1em;
}

.navbar {
  margin: 20px;
}
.navbar ul {
  list-style: none;
  margin: 0;
  display: flex;
  justify-content: center;
  align-items: center;
}

.navbar li {
  margin-right: 36px;
}

.navbar p,a {
  text-decoration: none;
  color: #333;
}

.navbar a:hover {
  text-decoration: underline;
}

.center-container {
  display: flex;
  margin-left: 15%;
  margin-right: 15%;
}

.card1 {
  text-decoration: none;
  margin-top: 15px;
  margin-bottom: 15px;
  color: #333;
  font-size: 1.2em;
}

.card1 a:hover {
  text-decoration: underline;
}

.card2 {
  padding-inline-start: 20px;
}

.card3 {
  display: flex;
  margin-top: 10px;
  margin-bottom: 10px;
}

.item1 {
  width: 38%;
}

.item2 {
  width: 38%;
  margin-left: 5%;
}

.item3 {
  width: 14%;
  margin-left: 5%;
}

@media (max-width: 800px) {
  * {
    font-size: 0.965em;
  }
  .center-container {
    display: flex;
    margin-left: 2%;
    margin-right: 5%;
  }

  .card2 {
    padding-inline-start: 1px;
  }
}
</style>
