<script setup>
import { ref, onMounted } from 'vue'

const awardsURL = `https://whu-icpc.github.io/WHU-ICPC/awards.json`
const awards = ref(null)
const isModalVisible = ref(false)
const callStack = ref([])

onMounted(async () => {
  const jsonData = await (await fetch(awardsURL)).json()
  jsonData.forEach(item => {
    item.collapsed = false;
  });
  awards.value = jsonData
})

const showModal = (s) => {
  if (callStack.value.length === 0 || s != callStack.value[callStack.value.length-1]) callStack.value.push(s);
  isModalVisible.value = true;
}
const backModal = () => {
  callStack.value.pop();
  if (callStack.value.length === 0) closeModal();
}
const closeModal = () => {
  callStack.value = [];
  isModalVisible.value = false;
}
const queryPerson = (s) => {
  let ret = {"contests": []};
  for (let i in awards.value) {
    const season = awards.value[i]
    console.log(season)
    for (let j in season.contests) {
      const contest = season.contests[j]
      for (let k in contest.teams) {
        const team = contest.teams[k]
        if (team.members.split('、').includes(s)) {
          ret["contests"].push({
            "contest": contest.contest,
            "date": contest.date,
            "team": team.team,
            "members": team.members,
            "prize": team.prize,
          })
        }
      }
    }
  } 
  return ret;
}
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
    <ul style="width: 100%;">
      <li v-for="season of awards">
        <div class="card1">
          <a href="#" @click="season.collapsed=!season.collapsed">{{ season.season }}</a>
        </div>
        <ul class="card2" v-if="!season.collapsed">
          <li v-for="contest of season.contests">
            <p>{{ contest.contest }}  {{ contest.date }}</p>
            <ul>
              <div v-for="team of contest.teams" class="card3">
                <p style="width: 38%;">{{ team.team }}</p>

                <div class="name" style="width: 40%;  margin-left: 4%;">
                <template v-for="(item, index) in team.members.split('、')">
                  <p style="display: inline-block;" v-if="index > 0">、</p>
                  <a href="#" @click="() => showModal(item)">{{ item }}</a>
                </template>
                </div>

                <p style="width: 14%;  margin-left: 4%;">{{ team.prize }}</p>
              </div>
            </ul>
          </li>
        </ul>
      </li>
    </ul>
  </div>

  <div v-if="isModalVisible" class="modal">
    <div class="modal-content">
      <div class="modal-title">
        <p style="font-size: 1.3em;"> {{ callStack[callStack.length - 1] }} </p>
        <div>
          <a v-if="callStack.length>1" style="margin-right: 20px;" href="#" @click="backModal">后退</a>
          <a style="margin-right: 20px;" href="#" @click="closeModal">关闭</a>
        </div>
      </div>

      <ul class="awards" style="width: 100%;">
        <li v-for="team of queryPerson(callStack[callStack.length - 1]).contests">
          <div style="display: flex;">
            <div class="card4" style="width: 37%;  display: flex;">
              <p class="item1"> {{ team.contest }} </p>
              <p class="item2"> {{ team.date }} </p>
              <p class="item3"> {{ team.prize }} </p>
            </div>
            <p style="width: 30%;  margin-left: 2%;"> {{ team.team }} </p>

            <div class="name" style="width: 30%;  margin-left: 2%;">
            <template v-for="(item, index) in team.members.split('、')">
              <p style="display: inline-block;" v-if="index > 0">、</p>
              <a href="#" @click="() => showModal(item)">{{ item }}</a>
            </template>
            </div>
          </div>
        </li>
      </ul>
    </div>
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

.name a {
  text-decoration: none;
}

.name a:hover {
  text-decoration: underline;
}

.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
}

.modal-content {
  width: 70%;
  max-height: 80%;
  background-color: #fff;
  padding: 20px;
  border-radius: 5px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
}

.modal-title {
  display: flex;
  margin-bottom: 15px;
  justify-content: space-between;
  align-items: flex-end;
}

.modal-title a {
  text-decoration: underline;
}

.awards {
  flex: 1;
  padding-inline-start: 15px;
  overflow: auto;
}

.item1 {
  width: 50%;
  margin-left: 3%;
}

.item2 {
  width: 30%;
  margin-left: 3%;
}

.item3 {
  width: 11%;
  margin-left: 3%;
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

  .center-container {
    padding-inline-start: 10px;
  }

  ul {
    padding-inline-start: 10px;
  }
}

@media (max-width: 1000px) {
  .modal-content {
    width: 90%;
    max-height: 90%;
  }

  .modal-content {
    padding-inline-start: 20px;
  }

  .awards {
    font-size: 0.95em;
  }

  .card4 {
    flex-direction: column;
  }

  .item1, .item2, .item3 {
    width: 100%;
  }
}
</style>