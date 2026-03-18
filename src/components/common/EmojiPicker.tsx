import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { jiraTheme } from 'lib/styles/jiraTheme';
import { Search, Clock, Smile, Dog, Coffee, Dribbble, Car, Lightbulb, Flag, Hash, X } from 'lucide-react';

/* ─── Emoji 카테고리 데이터 ─── */
export interface EmojiItem {
  emoji: string;
  name: string;
  keywords?: string[];
}

export interface EmojiCategory {
  id: string;
  label: string;
  icon: React.ReactNode;
  emojis: EmojiItem[];
}

const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    id: 'people',
    label: '사람',
    icon: <Smile size={14} />,
    emojis: [
      { emoji: '😀', name: 'grinning', keywords: ['smile', 'happy'] },
      { emoji: '😃', name: 'smiley', keywords: ['happy', 'joy'] },
      { emoji: '😄', name: 'smile', keywords: ['happy', 'joy'] },
      { emoji: '😁', name: 'grin', keywords: ['happy'] },
      { emoji: '😅', name: 'sweat_smile', keywords: ['hot'] },
      { emoji: '😂', name: 'joy', keywords: ['tears', 'laugh'] },
      { emoji: '🤣', name: 'rofl', keywords: ['laugh'] },
      { emoji: '😊', name: 'blush', keywords: ['smile'] },
      { emoji: '😇', name: 'innocent', keywords: ['angel'] },
      { emoji: '🙂', name: 'slightly_smiling', keywords: ['smile'] },
      { emoji: '🙃', name: 'upside_down', keywords: ['silly'] },
      { emoji: '😉', name: 'wink', keywords: [] },
      { emoji: '😌', name: 'relieved', keywords: ['calm'] },
      { emoji: '😍', name: 'heart_eyes', keywords: ['love'] },
      { emoji: '🥰', name: 'smiling_hearts', keywords: ['love'] },
      { emoji: '😘', name: 'kissing_heart', keywords: ['love'] },
      { emoji: '😗', name: 'kissing', keywords: [] },
      { emoji: '😙', name: 'kissing_smiling_eyes', keywords: [] },
      { emoji: '😚', name: 'kissing_closed_eyes', keywords: [] },
      { emoji: '😋', name: 'yum', keywords: ['delicious'] },
      { emoji: '😛', name: 'stuck_out_tongue', keywords: ['playful'] },
      { emoji: '😜', name: 'stuck_out_tongue_winking', keywords: ['playful'] },
      { emoji: '🤪', name: 'zany', keywords: ['crazy', 'wild'] },
      { emoji: '😝', name: 'stuck_out_tongue_closed_eyes', keywords: [] },
      { emoji: '🤑', name: 'money_mouth', keywords: ['rich'] },
      { emoji: '🤗', name: 'hugging', keywords: ['hug'] },
      { emoji: '🤭', name: 'hand_over_mouth', keywords: ['oops'] },
      { emoji: '🤫', name: 'shushing', keywords: ['quiet', 'secret'] },
      { emoji: '🤔', name: 'thinking', keywords: ['hmm'] },
      { emoji: '🤐', name: 'zipper_mouth', keywords: ['quiet'] },
      { emoji: '🤨', name: 'raised_eyebrow', keywords: ['skeptical'] },
      { emoji: '😐', name: 'neutral', keywords: ['meh'] },
      { emoji: '😑', name: 'expressionless', keywords: [] },
      { emoji: '😶', name: 'no_mouth', keywords: ['silent'] },
      { emoji: '😏', name: 'smirk', keywords: [] },
      { emoji: '😒', name: 'unamused', keywords: [] },
      { emoji: '🙄', name: 'rolling_eyes', keywords: ['annoyed'] },
      { emoji: '😬', name: 'grimacing', keywords: ['awkward'] },
      { emoji: '🤥', name: 'lying', keywords: [] },
      { emoji: '😔', name: 'pensive', keywords: ['sad'] },
      { emoji: '😪', name: 'sleepy', keywords: ['tired'] },
      { emoji: '🤤', name: 'drooling', keywords: [] },
      { emoji: '😴', name: 'sleeping', keywords: ['zzz'] },
      { emoji: '😷', name: 'mask', keywords: ['sick'] },
      { emoji: '🤒', name: 'thermometer', keywords: ['sick'] },
      { emoji: '🤕', name: 'bandage', keywords: ['hurt'] },
      { emoji: '🤢', name: 'nauseated', keywords: ['sick'] },
      { emoji: '🤮', name: 'vomiting', keywords: ['sick'] },
      { emoji: '🥵', name: 'hot', keywords: ['sweat'] },
      { emoji: '🥶', name: 'cold', keywords: ['freeze'] },
      { emoji: '🥴', name: 'woozy', keywords: ['dizzy'] },
      { emoji: '😵', name: 'dizzy', keywords: [] },
      { emoji: '🤯', name: 'exploding_head', keywords: ['mind_blown'] },
      { emoji: '🤠', name: 'cowboy', keywords: [] },
      { emoji: '🥳', name: 'partying', keywords: ['celebration'] },
      { emoji: '🥸', name: 'disguised', keywords: [] },
      { emoji: '😎', name: 'sunglasses', keywords: ['cool'] },
      { emoji: '🤓', name: 'nerd', keywords: ['geek'] },
      { emoji: '🧐', name: 'monocle', keywords: ['inspect'] },
      { emoji: '😕', name: 'confused', keywords: [] },
      { emoji: '😟', name: 'worried', keywords: [] },
      { emoji: '🙁', name: 'slightly_frowning', keywords: ['sad'] },
      { emoji: '😮', name: 'open_mouth', keywords: ['surprised'] },
      { emoji: '😯', name: 'hushed', keywords: [] },
      { emoji: '😲', name: 'astonished', keywords: ['surprised'] },
      { emoji: '😳', name: 'flushed', keywords: ['embarrassed'] },
      { emoji: '🥺', name: 'pleading', keywords: ['puppy_eyes'] },
      { emoji: '😦', name: 'frowning', keywords: [] },
      { emoji: '😧', name: 'anguished', keywords: [] },
      { emoji: '😨', name: 'fearful', keywords: ['scared'] },
      { emoji: '😰', name: 'anxious', keywords: ['nervous'] },
      { emoji: '😥', name: 'disappointed_relieved', keywords: [] },
      { emoji: '😢', name: 'cry', keywords: ['sad', 'tear'] },
      { emoji: '😭', name: 'sob', keywords: ['cry', 'sad'] },
      { emoji: '😱', name: 'scream', keywords: ['horror'] },
      { emoji: '😖', name: 'confounded', keywords: [] },
      { emoji: '😣', name: 'persevere', keywords: [] },
      { emoji: '😞', name: 'disappointed', keywords: ['sad'] },
      { emoji: '😓', name: 'sweat', keywords: [] },
      { emoji: '😩', name: 'weary', keywords: ['tired'] },
      { emoji: '😫', name: 'tired', keywords: ['exhausted'] },
      { emoji: '🥱', name: 'yawning', keywords: ['bored', 'sleepy'] },
      { emoji: '😤', name: 'triumph', keywords: ['angry'] },
      { emoji: '😡', name: 'rage', keywords: ['angry', 'mad'] },
      { emoji: '😠', name: 'angry', keywords: ['mad'] },
      { emoji: '🤬', name: 'cursing', keywords: ['swear'] },
      { emoji: '😈', name: 'smiling_imp', keywords: ['devil'] },
      { emoji: '👿', name: 'imp', keywords: ['devil'] },
      { emoji: '💀', name: 'skull', keywords: ['dead'] },
      { emoji: '☠️', name: 'skull_crossbones', keywords: ['dead'] },
      { emoji: '💩', name: 'poop', keywords: [] },
      { emoji: '🤡', name: 'clown', keywords: [] },
      { emoji: '👹', name: 'ogre', keywords: [] },
      { emoji: '👺', name: 'goblin', keywords: [] },
      { emoji: '👻', name: 'ghost', keywords: ['halloween'] },
      { emoji: '👽', name: 'alien', keywords: ['ufo'] },
      { emoji: '🤖', name: 'robot', keywords: [] },
      { emoji: '😺', name: 'smiley_cat', keywords: [] },
      { emoji: '😸', name: 'smile_cat', keywords: [] },
      { emoji: '😹', name: 'joy_cat', keywords: [] },
      { emoji: '😻', name: 'heart_eyes_cat', keywords: [] },
      { emoji: '😼', name: 'smirk_cat', keywords: [] },
      { emoji: '😽', name: 'kissing_cat', keywords: [] },
      { emoji: '🙀', name: 'scream_cat', keywords: [] },
      { emoji: '😿', name: 'crying_cat', keywords: [] },
      { emoji: '😾', name: 'pouting_cat', keywords: [] },
    ],
  },
  {
    id: 'gestures',
    label: '제스처',
    icon: <Hash size={14} />,
    emojis: [
      { emoji: '👋', name: 'wave', keywords: ['hello', 'hi'] },
      { emoji: '🤚', name: 'raised_back', keywords: ['stop'] },
      { emoji: '🖐️', name: 'raised_hand_fingers', keywords: ['high_five'] },
      { emoji: '✋', name: 'raised_hand', keywords: ['stop', 'high_five'] },
      { emoji: '🖖', name: 'vulcan', keywords: ['spock'] },
      { emoji: '👌', name: 'ok_hand', keywords: ['perfect'] },
      { emoji: '🤌', name: 'pinched_fingers', keywords: ['italian'] },
      { emoji: '🤏', name: 'pinching_hand', keywords: ['small'] },
      { emoji: '✌️', name: 'victory', keywords: ['peace'] },
      { emoji: '🤞', name: 'crossed_fingers', keywords: ['luck'] },
      { emoji: '🤟', name: 'love_you', keywords: [] },
      { emoji: '🤘', name: 'metal', keywords: ['rock'] },
      { emoji: '🤙', name: 'call_me', keywords: [] },
      { emoji: '👈', name: 'point_left', keywords: [] },
      { emoji: '👉', name: 'point_right', keywords: [] },
      { emoji: '👆', name: 'point_up', keywords: [] },
      { emoji: '🖕', name: 'middle_finger', keywords: [] },
      { emoji: '👇', name: 'point_down', keywords: [] },
      { emoji: '☝️', name: 'point_up_2', keywords: [] },
      { emoji: '👍', name: 'thumbsup', keywords: ['yes', 'good', 'like'] },
      { emoji: '👎', name: 'thumbsdown', keywords: ['no', 'bad', 'dislike'] },
      { emoji: '✊', name: 'fist', keywords: ['punch'] },
      { emoji: '👊', name: 'punch', keywords: ['fist'] },
      { emoji: '🤛', name: 'left_fist', keywords: [] },
      { emoji: '🤜', name: 'right_fist', keywords: [] },
      { emoji: '👏', name: 'clap', keywords: ['applause', 'bravo'] },
      { emoji: '🙌', name: 'raised_hands', keywords: ['hooray'] },
      { emoji: '👐', name: 'open_hands', keywords: [] },
      { emoji: '🤲', name: 'palms_up', keywords: [] },
      { emoji: '🤝', name: 'handshake', keywords: ['deal', 'agree'] },
      { emoji: '🙏', name: 'pray', keywords: ['please', 'thanks'] },
      { emoji: '✍️', name: 'writing_hand', keywords: [] },
      { emoji: '💪', name: 'muscle', keywords: ['strong', 'flex'] },
      { emoji: '🦾', name: 'mechanical_arm', keywords: ['robot'] },
      { emoji: '🦿', name: 'mechanical_leg', keywords: ['robot'] },
      { emoji: '🦵', name: 'leg', keywords: [] },
      { emoji: '🦶', name: 'foot', keywords: [] },
      { emoji: '👂', name: 'ear', keywords: ['listen'] },
      { emoji: '👃', name: 'nose', keywords: ['smell'] },
      { emoji: '👀', name: 'eyes', keywords: ['look', 'see'] },
      { emoji: '👁️', name: 'eye', keywords: ['see'] },
      { emoji: '👅', name: 'tongue', keywords: [] },
      { emoji: '👄', name: 'lips', keywords: ['kiss'] },
    ],
  },
  {
    id: 'nature',
    label: '자연',
    icon: <Dog size={14} />,
    emojis: [
      { emoji: '🐶', name: 'dog', keywords: ['puppy'] },
      { emoji: '🐱', name: 'cat', keywords: ['kitten'] },
      { emoji: '🐭', name: 'mouse', keywords: [] },
      { emoji: '🐹', name: 'hamster', keywords: [] },
      { emoji: '🐰', name: 'rabbit', keywords: ['bunny'] },
      { emoji: '🦊', name: 'fox', keywords: [] },
      { emoji: '🐻', name: 'bear', keywords: [] },
      { emoji: '🐼', name: 'panda', keywords: [] },
      { emoji: '🐨', name: 'koala', keywords: [] },
      { emoji: '🐯', name: 'tiger', keywords: [] },
      { emoji: '🦁', name: 'lion', keywords: [] },
      { emoji: '🐮', name: 'cow', keywords: [] },
      { emoji: '🐷', name: 'pig', keywords: [] },
      { emoji: '🐸', name: 'frog', keywords: [] },
      { emoji: '🐵', name: 'monkey', keywords: [] },
      { emoji: '🙈', name: 'see_no_evil', keywords: [] },
      { emoji: '🙉', name: 'hear_no_evil', keywords: [] },
      { emoji: '🙊', name: 'speak_no_evil', keywords: [] },
      { emoji: '🐔', name: 'chicken', keywords: [] },
      { emoji: '🐧', name: 'penguin', keywords: [] },
      { emoji: '🐦', name: 'bird', keywords: [] },
      { emoji: '🦆', name: 'duck', keywords: [] },
      { emoji: '🦅', name: 'eagle', keywords: [] },
      { emoji: '🦉', name: 'owl', keywords: [] },
      { emoji: '🦇', name: 'bat', keywords: [] },
      { emoji: '🐺', name: 'wolf', keywords: [] },
      { emoji: '🐗', name: 'boar', keywords: [] },
      { emoji: '🐴', name: 'horse', keywords: [] },
      { emoji: '🦄', name: 'unicorn', keywords: ['magic'] },
      { emoji: '🐝', name: 'bee', keywords: ['honey'] },
      { emoji: '🐛', name: 'bug', keywords: [] },
      { emoji: '🦋', name: 'butterfly', keywords: [] },
      { emoji: '🐌', name: 'snail', keywords: ['slow'] },
      { emoji: '🐞', name: 'ladybug', keywords: [] },
      { emoji: '🐜', name: 'ant', keywords: [] },
      { emoji: '🦟', name: 'mosquito', keywords: [] },
      { emoji: '🐢', name: 'turtle', keywords: ['slow'] },
      { emoji: '🐍', name: 'snake', keywords: [] },
      { emoji: '🦎', name: 'lizard', keywords: [] },
      { emoji: '🐙', name: 'octopus', keywords: [] },
      { emoji: '🦑', name: 'squid', keywords: [] },
      { emoji: '🦐', name: 'shrimp', keywords: [] },
      { emoji: '🦀', name: 'crab', keywords: [] },
      { emoji: '🐠', name: 'tropical_fish', keywords: [] },
      { emoji: '🐟', name: 'fish', keywords: [] },
      { emoji: '🐬', name: 'dolphin', keywords: [] },
      { emoji: '🐳', name: 'whale', keywords: [] },
      { emoji: '🌸', name: 'cherry_blossom', keywords: ['flower', 'spring'] },
      { emoji: '🌹', name: 'rose', keywords: ['flower', 'love'] },
      { emoji: '🌻', name: 'sunflower', keywords: [] },
      { emoji: '🌺', name: 'hibiscus', keywords: ['flower'] },
      { emoji: '🌷', name: 'tulip', keywords: ['flower'] },
      { emoji: '🌱', name: 'seedling', keywords: ['plant', 'grow'] },
      { emoji: '🌲', name: 'evergreen_tree', keywords: [] },
      { emoji: '🌳', name: 'tree', keywords: [] },
      { emoji: '🍀', name: 'four_leaf_clover', keywords: ['lucky'] },
      { emoji: '🍁', name: 'maple_leaf', keywords: ['fall', 'autumn'] },
      { emoji: '🍂', name: 'fallen_leaf', keywords: ['autumn'] },
      { emoji: '🍃', name: 'leaves', keywords: ['wind'] },
      { emoji: '🌿', name: 'herb', keywords: [] },
      { emoji: '🌾', name: 'rice', keywords: [] },
      { emoji: '🍄', name: 'mushroom', keywords: [] },
    ],
  },
  {
    id: 'food',
    label: '음식',
    icon: <Coffee size={14} />,
    emojis: [
      { emoji: '🍎', name: 'apple', keywords: ['fruit'] },
      { emoji: '🍐', name: 'pear', keywords: ['fruit'] },
      { emoji: '🍊', name: 'orange', keywords: ['fruit'] },
      { emoji: '🍋', name: 'lemon', keywords: ['fruit'] },
      { emoji: '🍌', name: 'banana', keywords: ['fruit'] },
      { emoji: '🍉', name: 'watermelon', keywords: ['fruit'] },
      { emoji: '🍇', name: 'grapes', keywords: ['fruit'] },
      { emoji: '🍓', name: 'strawberry', keywords: ['fruit'] },
      { emoji: '🫐', name: 'blueberries', keywords: ['fruit'] },
      { emoji: '🍈', name: 'melon', keywords: ['fruit'] },
      { emoji: '🍒', name: 'cherries', keywords: ['fruit'] },
      { emoji: '🍑', name: 'peach', keywords: ['fruit'] },
      { emoji: '🥭', name: 'mango', keywords: ['fruit'] },
      { emoji: '🍍', name: 'pineapple', keywords: ['fruit'] },
      { emoji: '🥥', name: 'coconut', keywords: [] },
      { emoji: '🥝', name: 'kiwi', keywords: ['fruit'] },
      { emoji: '🍅', name: 'tomato', keywords: [] },
      { emoji: '🥑', name: 'avocado', keywords: [] },
      { emoji: '🍆', name: 'eggplant', keywords: [] },
      { emoji: '🌶️', name: 'hot_pepper', keywords: ['spicy'] },
      { emoji: '🥕', name: 'carrot', keywords: [] },
      { emoji: '🌽', name: 'corn', keywords: [] },
      { emoji: '🥦', name: 'broccoli', keywords: [] },
      { emoji: '🧄', name: 'garlic', keywords: [] },
      { emoji: '🧅', name: 'onion', keywords: [] },
      { emoji: '🥐', name: 'croissant', keywords: ['bread'] },
      { emoji: '🍞', name: 'bread', keywords: [] },
      { emoji: '🥖', name: 'baguette', keywords: ['bread'] },
      { emoji: '🍕', name: 'pizza', keywords: [] },
      { emoji: '🍔', name: 'hamburger', keywords: ['burger'] },
      { emoji: '🍟', name: 'fries', keywords: ['french_fries'] },
      { emoji: '🌭', name: 'hotdog', keywords: [] },
      { emoji: '🥪', name: 'sandwich', keywords: [] },
      { emoji: '🌮', name: 'taco', keywords: [] },
      { emoji: '🌯', name: 'burrito', keywords: [] },
      { emoji: '🍣', name: 'sushi', keywords: [] },
      { emoji: '🍱', name: 'bento', keywords: [] },
      { emoji: '🍛', name: 'curry', keywords: [] },
      { emoji: '🍜', name: 'ramen', keywords: ['noodles'] },
      { emoji: '🍝', name: 'spaghetti', keywords: ['pasta'] },
      { emoji: '🍰', name: 'cake', keywords: ['dessert'] },
      { emoji: '🎂', name: 'birthday_cake', keywords: ['party'] },
      { emoji: '🍩', name: 'doughnut', keywords: ['donut'] },
      { emoji: '🍪', name: 'cookie', keywords: [] },
      { emoji: '🍫', name: 'chocolate', keywords: [] },
      { emoji: '🍬', name: 'candy', keywords: ['sweet'] },
      { emoji: '🍭', name: 'lollipop', keywords: ['candy'] },
      { emoji: '🍮', name: 'pudding', keywords: ['dessert'] },
      { emoji: '☕', name: 'coffee', keywords: ['cafe'] },
      { emoji: '🍵', name: 'tea', keywords: [] },
      { emoji: '🥤', name: 'cup_with_straw', keywords: ['drink'] },
      { emoji: '🍺', name: 'beer', keywords: [] },
      { emoji: '🍻', name: 'beers', keywords: ['cheers'] },
      { emoji: '🥂', name: 'champagne_glass', keywords: ['toast', 'cheers'] },
      { emoji: '🍷', name: 'wine', keywords: [] },
      { emoji: '🥃', name: 'whiskey', keywords: ['tumbler'] },
      { emoji: '🍸', name: 'cocktail', keywords: ['martini'] },
    ],
  },
  {
    id: 'activities',
    label: '활동',
    icon: <Dribbble size={14} />,
    emojis: [
      { emoji: '⚽', name: 'soccer', keywords: ['football'] },
      { emoji: '🏀', name: 'basketball', keywords: [] },
      { emoji: '🏈', name: 'football', keywords: [] },
      { emoji: '⚾', name: 'baseball', keywords: [] },
      { emoji: '🥎', name: 'softball', keywords: [] },
      { emoji: '🎾', name: 'tennis', keywords: [] },
      { emoji: '🏐', name: 'volleyball', keywords: [] },
      { emoji: '🏉', name: 'rugby', keywords: [] },
      { emoji: '🥏', name: 'frisbee', keywords: [] },
      { emoji: '🎱', name: 'billiards', keywords: ['pool'] },
      { emoji: '🏓', name: 'ping_pong', keywords: ['table_tennis'] },
      { emoji: '🏸', name: 'badminton', keywords: [] },
      { emoji: '🥊', name: 'boxing', keywords: [] },
      { emoji: '🥋', name: 'martial_arts', keywords: [] },
      { emoji: '🎯', name: 'dart', keywords: ['target', 'bullseye'] },
      { emoji: '⛳', name: 'golf', keywords: [] },
      { emoji: '🎮', name: 'video_game', keywords: ['gaming'] },
      { emoji: '🕹️', name: 'joystick', keywords: ['gaming'] },
      { emoji: '🎲', name: 'dice', keywords: ['game'] },
      { emoji: '🧩', name: 'puzzle', keywords: [] },
      { emoji: '🎭', name: 'performing_arts', keywords: ['theater'] },
      { emoji: '🎨', name: 'art', keywords: ['paint', 'palette'] },
      { emoji: '🎬', name: 'clapper', keywords: ['movie', 'film'] },
      { emoji: '🎤', name: 'microphone', keywords: ['karaoke', 'sing'] },
      { emoji: '🎧', name: 'headphones', keywords: ['music'] },
      { emoji: '🎵', name: 'musical_note', keywords: ['music'] },
      { emoji: '🎶', name: 'notes', keywords: ['music'] },
      { emoji: '🎹', name: 'piano', keywords: ['music'] },
      { emoji: '🎸', name: 'guitar', keywords: ['music', 'rock'] },
      { emoji: '🥁', name: 'drum', keywords: ['music'] },
      { emoji: '🎺', name: 'trumpet', keywords: ['music'] },
      { emoji: '🏆', name: 'trophy', keywords: ['award', 'win'] },
      { emoji: '🥇', name: 'gold_medal', keywords: ['first', 'win'] },
      { emoji: '🥈', name: 'silver_medal', keywords: ['second'] },
      { emoji: '🥉', name: 'bronze_medal', keywords: ['third'] },
      { emoji: '🎖️', name: 'military_medal', keywords: ['award'] },
      { emoji: '🏅', name: 'medal', keywords: ['award'] },
      { emoji: '🎗️', name: 'ribbon', keywords: [] },
      { emoji: '🎪', name: 'circus', keywords: [] },
      { emoji: '🎫', name: 'ticket', keywords: [] },
    ],
  },
  {
    id: 'travel',
    label: '여행',
    icon: <Car size={14} />,
    emojis: [
      { emoji: '🚗', name: 'car', keywords: ['drive'] },
      { emoji: '🚕', name: 'taxi', keywords: [] },
      { emoji: '🚌', name: 'bus', keywords: [] },
      { emoji: '🚎', name: 'trolleybus', keywords: [] },
      { emoji: '🏎️', name: 'racing_car', keywords: ['fast'] },
      { emoji: '🚑', name: 'ambulance', keywords: [] },
      { emoji: '🚒', name: 'fire_engine', keywords: [] },
      { emoji: '🚁', name: 'helicopter', keywords: [] },
      { emoji: '✈️', name: 'airplane', keywords: ['flight', 'travel'] },
      { emoji: '🚀', name: 'rocket', keywords: ['launch', 'ship'] },
      { emoji: '🛸', name: 'ufo', keywords: ['alien'] },
      { emoji: '🚢', name: 'ship', keywords: ['boat'] },
      { emoji: '⛵', name: 'sailboat', keywords: [] },
      { emoji: '🚲', name: 'bike', keywords: ['bicycle'] },
      { emoji: '🏠', name: 'house', keywords: ['home'] },
      { emoji: '🏢', name: 'office', keywords: ['building'] },
      { emoji: '🏥', name: 'hospital', keywords: [] },
      { emoji: '🏫', name: 'school', keywords: [] },
      { emoji: '🏰', name: 'castle', keywords: [] },
      { emoji: '⛪', name: 'church', keywords: [] },
      { emoji: '🕌', name: 'mosque', keywords: [] },
      { emoji: '🗽', name: 'statue_of_liberty', keywords: [] },
      { emoji: '🗼', name: 'tokyo_tower', keywords: [] },
      { emoji: '🌍', name: 'earth_africa', keywords: ['globe', 'world'] },
      { emoji: '🌎', name: 'earth_americas', keywords: ['globe', 'world'] },
      { emoji: '🌏', name: 'earth_asia', keywords: ['globe', 'world'] },
      { emoji: '🌙', name: 'crescent_moon', keywords: ['night'] },
      { emoji: '🌟', name: 'glowing_star', keywords: ['shine'] },
      { emoji: '⭐', name: 'star', keywords: [] },
      { emoji: '🌈', name: 'rainbow', keywords: [] },
      { emoji: '☀️', name: 'sun', keywords: ['sunny'] },
      { emoji: '⛅', name: 'partly_sunny', keywords: ['cloud'] },
      { emoji: '☁️', name: 'cloud', keywords: [] },
      { emoji: '🌧️', name: 'rain', keywords: [] },
      { emoji: '⛈️', name: 'thunder', keywords: ['storm'] },
      { emoji: '❄️', name: 'snowflake', keywords: ['cold', 'winter'] },
      { emoji: '🔥', name: 'fire', keywords: ['hot', 'flame'] },
      { emoji: '💧', name: 'droplet', keywords: ['water'] },
      { emoji: '🌊', name: 'wave', keywords: ['ocean', 'sea'] },
    ],
  },
  {
    id: 'objects',
    label: '사물',
    icon: <Lightbulb size={14} />,
    emojis: [
      { emoji: '⌚', name: 'watch', keywords: ['time'] },
      { emoji: '📱', name: 'phone', keywords: ['mobile'] },
      { emoji: '💻', name: 'computer', keywords: ['laptop'] },
      { emoji: '⌨️', name: 'keyboard', keywords: [] },
      { emoji: '🖥️', name: 'desktop', keywords: ['computer'] },
      { emoji: '🖨️', name: 'printer', keywords: [] },
      { emoji: '🖱️', name: 'mouse', keywords: ['computer'] },
      { emoji: '💽', name: 'disk', keywords: [] },
      { emoji: '💾', name: 'floppy_disk', keywords: ['save'] },
      { emoji: '💿', name: 'cd', keywords: [] },
      { emoji: '📀', name: 'dvd', keywords: [] },
      { emoji: '📷', name: 'camera', keywords: ['photo'] },
      { emoji: '📹', name: 'video_camera', keywords: [] },
      { emoji: '📺', name: 'tv', keywords: ['television'] },
      { emoji: '📻', name: 'radio', keywords: [] },
      { emoji: '🔔', name: 'bell', keywords: ['notification'] },
      { emoji: '🔕', name: 'no_bell', keywords: ['mute'] },
      { emoji: '📢', name: 'loudspeaker', keywords: ['announcement'] },
      { emoji: '📣', name: 'megaphone', keywords: [] },
      { emoji: '💡', name: 'bulb', keywords: ['idea', 'light'] },
      { emoji: '🔦', name: 'flashlight', keywords: [] },
      { emoji: '🔧', name: 'wrench', keywords: ['tool'] },
      { emoji: '🔨', name: 'hammer', keywords: ['tool'] },
      { emoji: '🛠️', name: 'tools', keywords: ['hammer', 'wrench'] },
      { emoji: '⚙️', name: 'gear', keywords: ['settings'] },
      { emoji: '🔩', name: 'nut_and_bolt', keywords: [] },
      { emoji: '🔗', name: 'link', keywords: ['chain'] },
      { emoji: '📎', name: 'paperclip', keywords: [] },
      { emoji: '📌', name: 'pushpin', keywords: ['pin'] },
      { emoji: '📍', name: 'round_pushpin', keywords: ['location'] },
      { emoji: '✂️', name: 'scissors', keywords: ['cut'] },
      { emoji: '📝', name: 'memo', keywords: ['note', 'write'] },
      { emoji: '✏️', name: 'pencil', keywords: ['write'] },
      { emoji: '📚', name: 'books', keywords: ['library', 'read'] },
      { emoji: '📖', name: 'open_book', keywords: ['read'] },
      { emoji: '📰', name: 'newspaper', keywords: ['news'] },
      { emoji: '📮', name: 'postbox', keywords: ['mail'] },
      { emoji: '📦', name: 'package', keywords: ['box', 'delivery'] },
      { emoji: '📋', name: 'clipboard', keywords: [] },
      { emoji: '📊', name: 'bar_chart', keywords: ['graph', 'stats'] },
      { emoji: '📈', name: 'chart_up', keywords: ['graph', 'increase'] },
      { emoji: '📉', name: 'chart_down', keywords: ['graph', 'decrease'] },
      { emoji: '🗓️', name: 'calendar', keywords: ['schedule', 'date'] },
      { emoji: '🔑', name: 'key', keywords: ['password'] },
      { emoji: '🗝️', name: 'old_key', keywords: [] },
      { emoji: '🔒', name: 'lock', keywords: ['security'] },
      { emoji: '🔓', name: 'unlock', keywords: [] },
    ],
  },
  {
    id: 'symbols',
    label: '기호',
    icon: <Flag size={14} />,
    emojis: [
      { emoji: '❤️', name: 'heart', keywords: ['love'] },
      { emoji: '🧡', name: 'orange_heart', keywords: ['love'] },
      { emoji: '💛', name: 'yellow_heart', keywords: ['love'] },
      { emoji: '💚', name: 'green_heart', keywords: ['love'] },
      { emoji: '💙', name: 'blue_heart', keywords: ['love'] },
      { emoji: '💜', name: 'purple_heart', keywords: ['love'] },
      { emoji: '🖤', name: 'black_heart', keywords: [] },
      { emoji: '🤍', name: 'white_heart', keywords: [] },
      { emoji: '🤎', name: 'brown_heart', keywords: [] },
      { emoji: '💔', name: 'broken_heart', keywords: [] },
      { emoji: '❣️', name: 'heart_exclamation', keywords: [] },
      { emoji: '💕', name: 'two_hearts', keywords: ['love'] },
      { emoji: '💞', name: 'revolving_hearts', keywords: [] },
      { emoji: '💓', name: 'heartbeat', keywords: [] },
      { emoji: '💗', name: 'heartpulse', keywords: [] },
      { emoji: '💖', name: 'sparkling_heart', keywords: [] },
      { emoji: '💘', name: 'cupid', keywords: ['love'] },
      { emoji: '💝', name: 'gift_heart', keywords: [] },
      { emoji: '💟', name: 'heart_decoration', keywords: [] },
      { emoji: '☮️', name: 'peace', keywords: [] },
      { emoji: '✝️', name: 'cross', keywords: [] },
      { emoji: '☪️', name: 'star_and_crescent', keywords: [] },
      { emoji: '☯️', name: 'yin_yang', keywords: [] },
      { emoji: '✡️', name: 'star_of_david', keywords: [] },
      { emoji: '♻️', name: 'recycle', keywords: [] },
      { emoji: '⚠️', name: 'warning', keywords: ['caution'] },
      { emoji: '🚫', name: 'no_entry', keywords: ['forbidden'] },
      { emoji: '❌', name: 'x', keywords: ['cross', 'no'] },
      { emoji: '⭕', name: 'o', keywords: ['circle'] },
      { emoji: '❗', name: 'exclamation', keywords: ['bang'] },
      { emoji: '❓', name: 'question', keywords: [] },
      { emoji: '‼️', name: 'double_exclamation', keywords: [] },
      { emoji: '⁉️', name: 'exclamation_question', keywords: [] },
      { emoji: '💯', name: '100', keywords: ['perfect', 'score'] },
      { emoji: '✅', name: 'check', keywords: ['done', 'yes'] },
      { emoji: '☑️', name: 'ballot_check', keywords: [] },
      { emoji: '✔️', name: 'heavy_check', keywords: ['yes'] },
      { emoji: '❎', name: 'negative_check', keywords: ['no'] },
      { emoji: '➕', name: 'plus', keywords: ['add'] },
      { emoji: '➖', name: 'minus', keywords: ['subtract'] },
      { emoji: '➗', name: 'division', keywords: [] },
      { emoji: '✖️', name: 'multiply', keywords: [] },
      { emoji: '♾️', name: 'infinity', keywords: [] },
      { emoji: '💲', name: 'dollar', keywords: ['money'] },
      { emoji: '💱', name: 'currency_exchange', keywords: [] },
      { emoji: '™️', name: 'trademark', keywords: [] },
      { emoji: '©️', name: 'copyright', keywords: [] },
      { emoji: '®️', name: 'registered', keywords: [] },
      { emoji: '🔴', name: 'red_circle', keywords: [] },
      { emoji: '🟠', name: 'orange_circle', keywords: [] },
      { emoji: '🟡', name: 'yellow_circle', keywords: [] },
      { emoji: '🟢', name: 'green_circle', keywords: [] },
      { emoji: '🔵', name: 'blue_circle', keywords: [] },
      { emoji: '🟣', name: 'purple_circle', keywords: [] },
      { emoji: '⚪', name: 'white_circle', keywords: [] },
      { emoji: '⚫', name: 'black_circle', keywords: [] },
      { emoji: '🟤', name: 'brown_circle', keywords: [] },
      { emoji: '🔶', name: 'large_orange_diamond', keywords: [] },
      { emoji: '🔷', name: 'large_blue_diamond', keywords: [] },
      { emoji: '🎉', name: 'tada', keywords: ['party', 'celebration'] },
      { emoji: '🎊', name: 'confetti', keywords: ['celebration'] },
      { emoji: '🎈', name: 'balloon', keywords: ['party'] },
      { emoji: '🎁', name: 'gift', keywords: ['present'] },
      { emoji: '🎀', name: 'ribbon', keywords: [] },
      { emoji: '🏳️', name: 'white_flag', keywords: [] },
      { emoji: '🏴', name: 'black_flag', keywords: [] },
      { emoji: '🚩', name: 'red_flag', keywords: [] },
      { emoji: '🏁', name: 'checkered_flag', keywords: ['finish'] },
    ],
  },
];

const FREQUENT_KEY = 'lyra:emoji:frequent';

function getFrequentEmojis(): string[] {
  try {
    const raw = localStorage.getItem(FREQUENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveFrequentEmoji(emoji: string) {
  const list = getFrequentEmojis().filter((e) => e !== emoji);
  list.unshift(emoji);
  localStorage.setItem(FREQUENT_KEY, JSON.stringify(list.slice(0, 24)));
}

/* ─── Component ─── */
interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

const EmojiPickerPanel = ({ onSelect, onClose }: EmojiPickerProps) => {
  const [search, setSearch] = useState('');
  const [activeCategoryId, setActiveCategoryId] = useState('people');
  const [frequentEmojis, setFrequentEmojis] = useState<string[]>(getFrequentEmojis);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // 외부 클릭 감지
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  // 포커스
  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  const handleSelect = useCallback((emoji: string) => {
    saveFrequentEmoji(emoji);
    setFrequentEmojis(getFrequentEmojis());
    onSelect(emoji);
  }, [onSelect]);

  // 검색 결과
  const searchResults = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase();
    const results: EmojiItem[] = [];
    for (const cat of EMOJI_CATEGORIES) {
      for (const item of cat.emojis) {
        if (
          item.name.includes(q) ||
          item.emoji === q ||
          item.keywords?.some((k) => k.includes(q))
        ) {
          results.push(item);
        }
      }
    }
    return results;
  }, [search]);

  // 카테고리 탭 클릭 → 스크롤
  const scrollToCategory = useCallback((id: string) => {
    setActiveCategoryId(id);
    const el = categoryRefs.current[id];
    if (el && scrollRef.current) {
      scrollRef.current.scrollTo({ top: el.offsetTop - scrollRef.current.offsetTop, behavior: 'smooth' });
    }
  }, []);

  // 스크롤 시 활성 카테고리 업데이트
  const handleScroll = useCallback(() => {
    if (!scrollRef.current || search.trim()) return;
    const scrollTop = scrollRef.current.scrollTop;
    const containerTop = scrollRef.current.offsetTop;
    let currentId = EMOJI_CATEGORIES[0].id;
    for (const cat of EMOJI_CATEGORIES) {
      const el = categoryRefs.current[cat.id];
      if (el && el.offsetTop - containerTop <= scrollTop + 10) {
        currentId = cat.id;
      }
    }
    setActiveCategoryId(currentId);
  }, [search]);

  return (
    <Panel ref={panelRef}>
      {/* 카테고리 탭 바 */}
      <CategoryBar>
        <CategoryTab
          $active={activeCategoryId === 'frequent'}
          onClick={() => scrollToCategory('frequent')}
          title="자주 사용"
        >
          <Clock size={14} />
        </CategoryTab>
        {EMOJI_CATEGORIES.map((cat) => (
          <CategoryTab
            key={cat.id}
            $active={activeCategoryId === cat.id}
            onClick={() => scrollToCategory(cat.id)}
            title={cat.label}
          >
            {cat.icon}
          </CategoryTab>
        ))}
      </CategoryBar>

      {/* 검색 */}
      <SearchRow>
        <SearchIcon><Search size={13} /></SearchIcon>
        <SearchInput
          ref={searchRef}
          placeholder="검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <ClearBtn onClick={() => setSearch('')}><X size={12} /></ClearBtn>
        )}
      </SearchRow>

      {/* 이모지 그리드 */}
      <ScrollArea ref={scrollRef} onScroll={handleScroll}>
        {searchResults !== null ? (
          // 검색 결과
          searchResults.length > 0 ? (
            <CategorySection>
              <CategoryLabel>검색 결과</CategoryLabel>
              <EmojiGrid>
                {searchResults.map((item) => (
                  <EmojiButton
                    key={item.emoji}
                    title={`:${item.name}:`}
                    onClick={() => handleSelect(item.emoji)}
                  >
                    {item.emoji}
                  </EmojiButton>
                ))}
              </EmojiGrid>
            </CategorySection>
          ) : (
            <EmptyState>검색 결과 없음</EmptyState>
          )
        ) : (
          <>
            {/* 자주 사용 */}
            {frequentEmojis.length > 0 && (
              <CategorySection ref={(el) => { categoryRefs.current['frequent'] = el; }}>
                <CategoryLabel>자주 사용</CategoryLabel>
                <EmojiGrid>
                  {frequentEmojis.map((emoji) => (
                    <EmojiButton key={emoji} onClick={() => handleSelect(emoji)}>
                      {emoji}
                    </EmojiButton>
                  ))}
                </EmojiGrid>
              </CategorySection>
            )}

            {/* 각 카테고리 */}
            {EMOJI_CATEGORIES.map((cat) => (
              <CategorySection key={cat.id} ref={(el) => { categoryRefs.current[cat.id] = el; }}>
                <CategoryLabel>{cat.label}</CategoryLabel>
                <EmojiGrid>
                  {cat.emojis.map((item) => (
                    <EmojiButton
                      key={item.emoji}
                      title={`:${item.name}:`}
                      onClick={() => handleSelect(item.emoji)}
                    >
                      {item.emoji}
                    </EmojiButton>
                  ))}
                </EmojiGrid>
              </CategorySection>
            ))}
          </>
        )}
      </ScrollArea>
    </Panel>
  );
};

export default EmojiPickerPanel;

/* ─── Styled Components ─── */

const Panel = styled.div`
  position: absolute;
  top: 100%;
  right: 0;
  z-index: 50;
  width: 320px;
  background: ${jiraTheme.bg.default};
  border: 1px solid ${jiraTheme.border};
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
  overflow: hidden;
`;

const CategoryBar = styled.div`
  display: flex;
  gap: 0;
  padding: 6px 8px;
  border-bottom: 1px solid ${jiraTheme.border};
  overflow-x: auto;

  &::-webkit-scrollbar {
    display: none;
  }
`;

const CategoryTab = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: ${({ $active }) => $active ? `${jiraTheme.primary}18` : 'transparent'};
  color: ${({ $active }) => $active ? jiraTheme.primary : jiraTheme.text.secondary};
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.12s, color 0.12s;

  &:hover {
    background: ${jiraTheme.bg.hover};
    color: ${jiraTheme.text.primary};
  }
`;

const SearchRow = styled.div`
  display: flex;
  align-items: center;
  margin: 8px 10px;
  padding: 0 8px;
  border: 1px solid ${jiraTheme.border};
  border-radius: 6px;
  background: ${jiraTheme.bg.subtle};
`;

const SearchIcon = styled.span`
  display: flex;
  color: ${jiraTheme.text.secondary};
  flex-shrink: 0;
`;

const SearchInput = styled.input`
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  padding: 6px 6px;
  font-size: 0.8125rem;
  color: ${jiraTheme.text.primary};

  &::placeholder {
    color: ${jiraTheme.text.secondary};
  }
`;

const ClearBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: ${jiraTheme.text.secondary};
  cursor: pointer;

  &:hover {
    background: ${jiraTheme.bg.hover};
  }
`;

const ScrollArea = styled.div`
  max-height: 280px;
  overflow-y: auto;
  padding: 4px 6px 8px;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background: ${jiraTheme.border};
    border-radius: 3px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }
`;

const CategorySection = styled.div`
  margin-bottom: 4px;
`;

const CategoryLabel = styled.div`
  font-size: 0.6875rem;
  font-weight: 600;
  color: ${jiraTheme.text.secondary};
  padding: 6px 4px 4px;
  text-transform: uppercase;
  letter-spacing: 0.02em;
`;

const EmojiGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 1px;
`;

const EmojiButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  padding: 0;
  font-size: 1.25rem;
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.1s, transform 0.1s;

  &:hover {
    background: ${jiraTheme.bg.hover};
    transform: scale(1.15);
  }
`;

const EmptyState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 80px;
  color: ${jiraTheme.text.secondary};
  font-size: 0.8125rem;
`;
