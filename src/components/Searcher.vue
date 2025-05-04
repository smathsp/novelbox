<template>
    <div class="search-replace-toolbar" v-show="showSearchReplace">
        <div class="search-replace-inputs">
            <input type="text" v-model="searchText" placeholder="查找内容" class="search-input" />
            <input type="text" v-model="replaceText" placeholder="替换内容" class="replace-input" />
        </div>
        <div class="search-replace-buttons">
            <button @click="search" class="search-btn">查找</button>
            <button @click="replace" class="replace-btn">替换</button>
            <button @click="replaceAll" class="replace-all-btn">全部替换</button>
            <button @click="closeSearchReplace" class="close-btn">关闭</button>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { Quill } from '@vueup/vue-quill'

export default defineComponent({
    name: 'Searcher',
    props: {
        quill: {
            type: Object as () => Quill,
            required: true
        },
        showSearchReplace: {
            type: Boolean,
            required: true
        }
    },
    emits: ['update:showSearchReplace'],
    data() {
        return {
            searchText: "",
            replaceText: "",
            occurrencesIndices: [] as number[],
            currentIndex: 0,
            SearchedStringLength: 0,
            SearchedString: "",
            lastSearchStartIndex: 0
        };
    },
    methods: {
        search() {
            if (!this.quill) {
                console.warn('Quill实例未初始化');
                return;
            }
            this.removeStyle();
            if (this.searchText) {
                const totalText = this.quill.getText();
                if (this.SearchedString !== this.searchText) {
                    this.lastSearchStartIndex = 0;
                    this.SearchedString = this.searchText;
                }
                
                const re = new RegExp(this.SearchedString, 'gi');
                const match = re.test(totalText);
                if (match) {
                    this.occurrencesIndices = this.getIndicesOf(totalText, this.SearchedString, this.lastSearchStartIndex);
                    this.SearchedStringLength = this.SearchedString.length;
                    
                    if (this.occurrencesIndices.length > 0) {
                        this.quill.setSelection(this.occurrencesIndices[0], this.SearchedStringLength);
                        this.lastSearchStartIndex = this.occurrencesIndices[0] + 1;
                    } else {
                        if (this.lastSearchStartIndex > 0) {
                            this.lastSearchStartIndex = 0;
                            this.search();
                            return;
                        }
                    }
                } else {
                    this.occurrencesIndices = [];
                    this.currentIndex = 0;
                    this.lastSearchStartIndex = 0;
                }
            } else {
                this.removeStyle();
                this.lastSearchStartIndex = 0;
            }
        },
        replace() {
            if (!this.quill || !this.SearchedString) return;

            if (!this.occurrencesIndices.length) this.search();
            if (!this.occurrencesIndices.length) return;

            const oldString = this.searchText;
            const newString = this.replaceText;

            this.quill.deleteText(this.occurrencesIndices[this.currentIndex], oldString.length);
            this.quill.insertText(this.occurrencesIndices[this.currentIndex], newString);
            this.quill.formatText(
                this.occurrencesIndices[this.currentIndex],
                newString.length,
                'SearchedString',
                false
            );
            this.search();
        },
        replaceAll() {
            if (!this.quill || !this.SearchedString) return;
            const oldStringLen = this.searchText.length;
            const newString = this.replaceText;

            if (!this.occurrencesIndices.length) this.search();
            if (!this.occurrencesIndices.length) return;

            while (this.occurrencesIndices.length) {
                this.quill.deleteText(this.occurrencesIndices[0], oldStringLen);
                this.quill.insertText(this.occurrencesIndices[0], newString);
                this.search();
            }
            this.removeStyle();
        },
        keyPressedHandler(e: KeyboardEvent) {
            if (e.key === 'Enter') {
                this.search();
            }
        },
        removeStyle() {
            if (!this.quill) return;
            this.quill.setSelection(null);
        },
        getIndicesOf(text: string, searchStr: string, startFrom: number = 0): number[] {
            const searchStrLen = searchStr.length;
            let startIndex = startFrom;
            let index;
            const indices: number[] = [];
            while ((index = text.toLowerCase().indexOf(searchStr.toLowerCase(), startIndex)) > -1) {
                indices.push(index);
                startIndex = index + searchStrLen;
            }
            return indices;
        },
        closeSearchReplace() {
            this.$emit('update:showSearchReplace', false)
            this.searchText = ''
            this.replaceText = ''
        }
    }
});
</script>

<style scoped>

.search-replace-toolbar {
  @apply fixed top-4 right-4 w-96 px-3 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-black shadow-lg z-50 !important;
}

.search-replace-inputs {
  @apply flex flex-col gap-2 mb-3;
}

.search-input,
.replace-input {
  @apply w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-black text-sm !important;
}

.search-replace-buttons {
  @apply flex gap-2 justify-end;
}

.search-btn,
.replace-btn,
.replace-all-btn,
.close-btn {
  @apply px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-200;
}

.search-btn {
  @apply bg-blue-500 text-white hover:bg-blue-600;
}

.replace-btn,
.replace-all-btn {
  @apply bg-green-500 text-white hover:bg-green-600 !important;
}

.close-btn {
  @apply bg-gray-500 text-white hover:bg-gray-600;
}

</style>